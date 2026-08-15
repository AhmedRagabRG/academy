import { Injectable } from '@nestjs/common';
import type {
  FinanceReductionKind,
  FinanceScholarshipCoverage,
} from '../../../../prisma/generated/client';
import { BranchScopeService } from '../../../core/authorization/branch-scope.service';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  FinanceValidationException,
  FinanceVersionConflictException,
  InvoiceNotFoundException,
} from '../../../core/exceptions/student-finance.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { FinanceBalanceService } from '../balances/finance-balance.service';
import {
  FINANCE_EVENT_NAMES,
  financeEvent,
} from '../events/student-finance.events';
import { InvoiceRepository } from '../invoices/invoice.repository';
import {
  DISCOUNT_MAX_SCALED,
  SCHOLARSHIP_MAX_SCALED,
} from '../lookups/finance-policy.config';
import { FinanceTimelineService } from '../statements/finance-timeline.service';
import type { ApplyDiscountDto } from './dto/apply-discount.dto';
import type { AwardScholarshipDto } from './dto/award-scholarship.dto';
import { ReductionPolicy } from './reduction.policy';
import { ReductionRepository } from './reduction.repository';

const toStoredKind = (kind: string): FinanceReductionKind =>
  kind === 'percentage' ? 'PERCENTAGE' : 'AMOUNT';

const toStoredCoverage = (c: string): FinanceScholarshipCoverage =>
  c === 'full-tuition' ? 'FULL_TUITION' : 'PARTIAL_TUITION';

/**
 * A percentage arrives as a decimal string ("10.5") and is stored as scaled
 * points (1050); a fixed amount arrives as money and is stored in minor units.
 * Both conversions live here so no caller invents its own scale.
 */
const toScaledPercentage = (value: string): bigint => {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
};

const toMinorAmount = (value: string, precision: number): bigint => {
  const [whole = '0', fraction = ''] = value.split('.');
  return (
    BigInt(whole) * 10n ** BigInt(precision) +
    BigInt(fraction.padEnd(precision, '0').slice(0, precision) || '0')
  );
};

@Injectable()
export class ReductionService {
  constructor(
    private readonly repository: ReductionRepository,
    private readonly invoices: InvoiceRepository,
    private readonly balances: FinanceBalanceService,
    private readonly policy: ReductionPolicy,
    private readonly timeline: FinanceTimelineService,
    private readonly events: DomainEventBus,
    private readonly transactions: TransactionManager,
    private readonly branchScope: BranchScopeService,
    private readonly profile: OrganizationProfileService,
  ) {}

  /**
   * Applies a discount to one invoice. Once an invoice is issued its figures
   * are frozen by a database trigger, so the monetary effect is recorded as a
   * `FinancialAdjustment` rather than by rewriting the issued snapshot.
   */
  async applyDiscount(
    caller: CallerContext,
    invoiceId: string,
    dto: ApplyDiscountDto,
  ) {
    const organizationId = (await this.profile.get()).organizationId;

    const result = await this.transactions.runSerializable(async (tx) => {
      const invoice = await this.invoices.findDetail(
        invoiceId,
        organizationId,
        tx,
      );
      if (!invoice) throw new InvoiceNotFoundException();
      this.branchScope.assertInScope(caller, invoice.branchId);

      if (invoice.version !== dto.expectedVersion) {
        throw new FinanceVersionConflictException(invoice.version);
      }

      const kind = toStoredKind(dto.kind);
      const value =
        kind === 'PERCENTAGE'
          ? toScaledPercentage(dto.value)
          : toMinorAmount(dto.value, invoice.precision);

      this.policy.assertWithinPolicyLimit(kind, value, DISCOUNT_MAX_SCALED);

      const balance = await this.balances.rawForInvoice(invoice.id, tx);
      const reductionMinor = this.policy.computeReductionAmount(
        kind,
        value,
        balance.finalMinor,
      );
      if (reductionMinor <= 0n) throw new FinanceValidationException();

      // A reduction may not drop the final amount under what is collected.
      this.policy.assertNotBelowCollected(
        balance.finalMinor - reductionMinor,
        balance.collectedMinor,
        invoice.currency,
        invoice.precision,
        (minor, currency, precision) =>
          fromMinorUnits(minor, currency, precision).amount,
      );

      const discount = await this.repository.createDiscount(
        {
          invoiceId: invoice.id,
          kind,
          value,
          reason: dto.reason,
          approvedById: caller.accountId,
          approvedByName: caller.displayName,
        },
        tx,
      );

      await this.repository.createAdjustment(
        {
          invoiceId: invoice.id,
          sourceKind: 'DISCOUNT',
          sourceId: discount.id,
          amountMinor: reductionMinor,
          currency: invoice.currency,
          precision: invoice.precision,
          reason: dto.reason,
          approvedById: caller.accountId,
          approvedByName: caller.displayName,
        },
        tx,
      );

      // A reduction changes what the invoice detail reports, so the aggregate
      // version moves once, under the same compare-and-swap.
      await this.invoices.touchVersion(
        invoice.id,
        dto.expectedVersion,
        caller.accountId,
        caller.displayName,
        tx,
      );

      await this.timeline.record(
        {
          organizationId,
          studentId: invoice.studentId,
          invoiceId: invoice.id,
          category: 'discount-applied',
          actorId: caller.accountId,
          actorName: caller.displayName,
          subjectRef: discount.id,
          amountMinor: reductionMinor,
          currency: invoice.currency,
          precision: invoice.precision,
        },
        tx,
      );

      return {
        discount,
        reductionMinor,
        currency: invoice.currency,
        precision: invoice.precision,
      };
    });

    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.discountApproved, {
        actorId: caller.accountId,
        targetType: 'invoice',
        targetId: invoiceId,
        operation: 'discount-approved',
        payload: {
          discountId: result.discount.id,
          amountMinor: result.reductionMinor.toString(),
          currency: result.currency,
        },
      }),
    );

    return {
      id: result.discount.id,
      invoiceId,
      kind: result.discount.kind.toLowerCase(),
      reason: result.discount.reason,
      amount: fromMinorUnits(
        result.reductionMinor,
        result.currency,
        result.precision,
      ),
      approvedBy: {
        id: result.discount.approvedById,
        name: result.discount.approvedByName,
      },
      approvedAt: result.discount.approvedAt.toISOString(),
    };
  }

  /**
   * Awards a scholarship. An absent `enrollmentId` scopes it to every
   * enrollment of the student, so it is stored null rather than defaulted to
   * one arbitrary enrollment.
   */
  async awardScholarship(caller: CallerContext, dto: AwardScholarshipDto) {
    const organizationId = (await this.profile.get()).organizationId;

    const scholarship = await this.transactions.runSerializable(async (tx) => {
      const kind = toStoredKind(dto.kind);
      const value =
        kind === 'PERCENTAGE'
          ? toScaledPercentage(dto.value)
          : toMinorAmount(dto.value, 2);

      this.policy.assertWithinPolicyLimit(kind, value, SCHOLARSHIP_MAX_SCALED);

      const created = await this.repository.createScholarship(
        {
          organizationId,
          studentId: dto.studentId,
          enrollmentId: dto.enrollmentId ?? null,
          name: dto.name,
          kind,
          value,
          coverage: toStoredCoverage(dto.coverage),
          reason: dto.reason,
          approvedById: caller.accountId,
          approvedByName: caller.displayName,
        },
        tx,
      );

      await this.timeline.record(
        {
          organizationId,
          studentId: dto.studentId,
          category: 'scholarship-applied',
          actorId: caller.accountId,
          actorName: caller.displayName,
          subjectRef: created.id,
        },
        tx,
      );

      return created;
    });

    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.scholarshipApproved, {
        actorId: caller.accountId,
        targetType: 'finance-account',
        targetId: dto.studentId,
        operation: 'scholarship-approved',
        payload: {
          scholarshipId: scholarship.id,
          studentId: dto.studentId,
          coverage: scholarship.coverage,
        },
      }),
    );

    return {
      id: scholarship.id,
      studentId: scholarship.studentId,
      enrollmentId: scholarship.enrollmentId ?? undefined,
      name: scholarship.name,
      kind: scholarship.kind.toLowerCase(),
      coverage: scholarship.coverage.toLowerCase().replaceAll('_', '-'),
      reason: scholarship.reason,
      approvedBy: {
        id: scholarship.approvedById,
        name: scholarship.approvedByName,
      },
      approvedAt: scholarship.approvedAt.toISOString(),
    };
  }
}
