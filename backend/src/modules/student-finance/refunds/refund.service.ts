import { Injectable } from '@nestjs/common';
import type {
  FinanceRefundStatus,
  Refund,
} from '../../../../prisma/generated/client';
import { BranchScopeService } from '../../../core/authorization/branch-scope.service';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  FinanceValidationException,
  PaymentNotFoundException,
  RefundExceedsPaymentException,
  RefundNotFoundException,
} from '../../../core/exceptions/student-finance.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import {
  createPageResult,
  normalizePageQuery,
  pageOffset,
} from '../../../shared/pagination/pagination.helper';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  normalizeArabic,
  normalizeDigits,
} from '../../../shared/utils/arabic-normalize';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { FinanceMoneyPolicy } from '../balances/finance-money.policy';
import {
  FINANCE_EVENT_NAMES,
  financeEvent,
} from '../events/student-finance.events';
import { PaymentRepository } from '../payments/payment.repository';
import { FinanceTimelineService } from '../statements/finance-timeline.service';
import type { DecideRefundDto, ListRefundsDto, RequestRefundDto } from './dto/request-refund.dto';
import type { CompleteRefundDto } from './dto/request-refund.dto';
import { RefundLifecyclePolicy, type RefundStatus } from './refund-lifecycle.policy';
import { RefundRepository, type RefundSortField } from './refund.repository';

const toWireStatus = (s: FinanceRefundStatus): string => s.toLowerCase();

export interface RefundSummaryDto {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: { amount: string; currency: string; precision: number };
  reason: string;
  refundDate: string;
  status: string;
  requestedBy: { id: string; name: string };
  requestedAt: string;
  decidedBy?: { id: string; name: string };
  decidedAt?: string;
  decisionReason?: string;
  completedAt?: string;
  version: number;
}

@Injectable()
export class RefundService {
  constructor(
    private readonly repository: RefundRepository,
    private readonly payments: PaymentRepository,
    private readonly lifecycle: RefundLifecyclePolicy,
    private readonly money: FinanceMoneyPolicy,
    private readonly timeline: FinanceTimelineService,
    private readonly events: DomainEventBus,
    private readonly transactions: TransactionManager,
    private readonly branchScope: BranchScopeService,
    private readonly profile: OrganizationProfileService,
  ) {}

  /**
   * A refund always names the payment it reverses. Without that anchor the
   * refundable ceiling is unknowable, which is why `paymentId` is required by
   * the contract rather than inferred from the invoice.
   */
  async request(
    caller: CallerContext,
    dto: RequestRefundDto,
  ): Promise<RefundSummaryDto> {
    const organizationId = (await this.profile.get()).organizationId;

    const refund = await this.transactions.runSerializable(async (tx) => {
      const payment = await this.payments.findById(dto.paymentId, tx);
      if (!payment) throw new PaymentNotFoundException();

      this.branchScope.assertInScope(caller, payment.branchId);

      const amountMinor = this.money.toPositiveMinor(
        dto.amount,
        payment.currency,
        payment.precision,
      );

      if (!this.lifecycle.validateMinimumReasonLength(dto.reason)) {
        throw new FinanceValidationException();
      }
      this.assertNotFuture(dto.refundDate);

      // Requested and approved refunds still reserve the money, so two
      // concurrent requests cannot both pass this ceiling.
      const claimed = await this.repository.sumClaimedForPayment(
        payment.id,
        tx,
      );
      const refundable = this.lifecycle.computePaymentRefundable(
        payment.amountMinor,
        claimed,
        0n,
      );
      if (amountMinor > refundable) {
        throw new RefundExceedsPaymentException(
          fromMinorUnits(refundable, payment.currency, payment.precision)
            .amount,
        );
      }

      const created = await this.repository.create(
        {
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          organizationId,
          studentId: payment.studentId,
          branchId: payment.branchId,
          amountMinor,
          currency: payment.currency,
          precision: payment.precision,
          reason: dto.reason,
          refundDate: new Date(dto.refundDate),
          requestedById: caller.accountId,
          requestedByName: caller.displayName,
        },
        tx,
      );

      await this.timeline.record(
        {
          organizationId,
          studentId: payment.studentId,
          invoiceId: payment.invoiceId,
          category: 'refund-requested',
          actorId: caller.accountId,
          actorName: caller.displayName,
          subjectRef: created.id,
          amountMinor,
          currency: payment.currency,
          precision: payment.precision,
        },
        tx,
      );

      return created;
    });

    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.refundRequested, {
        actorId: caller.accountId,
        targetType: 'refund',
        targetId: refund.id,
        operation: 'refund-requested',
        payload: {
          invoiceId: refund.invoiceId,
          amountMinor: refund.amountMinor.toString(),
          currency: refund.currency,
        },
      }),
    );

    return this.toSummary(refund);
  }

  /** `PATCH /finance/refunds/:id/decision` — approve or reject. */
  async decide(
    caller: CallerContext,
    refundId: string,
    dto: DecideRefundDto,
  ): Promise<RefundSummaryDto> {
    const target: RefundStatus =
      dto.decision === 'approved' ? 'APPROVED' : 'REJECTED';

    const refund = await this.transactions.runSerializable(async (tx) => {
      const current = await this.repository.findById(refundId, tx);
      if (!current) throw new RefundNotFoundException();
      this.branchScope.assertInScope(caller, current.branchId);

      this.assertTransition(current.status, target);

      // Rejecting without a reason leaves an unexplainable financial record.
      if (this.lifecycle.isReasonRequired(target)) {
        if (!dto.reason || !this.lifecycle.validateMinimumReasonLength(dto.reason)) {
          throw new FinanceValidationException();
        }
      }

      return this.repository.updateWithVersion(
        refundId,
        dto.expectedVersion,
        {
          status: target,
          decidedById: caller.accountId,
          decidedByName: caller.displayName,
          decidedAt: new Date(),
          decisionReason: dto.reason ?? null,
        },
        tx,
      );
    });

    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.refundDecided, {
        actorId: caller.accountId,
        targetType: 'refund',
        targetId: refund.id,
        operation: 'refund-decided',
        payload: {
          invoiceId: refund.invoiceId,
          toStatus: toWireStatus(refund.status),
          resultVersion: refund.version,
        },
      }),
    );

    return this.toSummary(refund);
  }

  /**
   * Completion is the only transition that moves money in the balance
   * derivation — the view counts `COMPLETED` refunds and nothing else.
   */
  async complete(
    caller: CallerContext,
    refundId: string,
    dto: CompleteRefundDto,
  ): Promise<RefundSummaryDto> {
    const organizationId = (await this.profile.get()).organizationId;

    const refund = await this.transactions.runSerializable(async (tx) => {
      const current = await this.repository.findById(refundId, tx);
      if (!current) throw new RefundNotFoundException();
      this.branchScope.assertInScope(caller, current.branchId);

      this.assertTransition(current.status, 'COMPLETED');

      const updated = await this.repository.updateWithVersion(
        refundId,
        dto.expectedVersion,
        { status: 'COMPLETED', completedAt: new Date() },
        tx,
      );

      // The invoice detail now reports a different net paid figure.
      await this.payments.incrementInvoiceVersion(updated.invoiceId, tx);

      await this.timeline.record(
        {
          organizationId,
          studentId: updated.studentId,
          invoiceId: updated.invoiceId,
          category: 'refund-completed',
          actorId: caller.accountId,
          actorName: caller.displayName,
          subjectRef: updated.id,
          amountMinor: updated.amountMinor,
          currency: updated.currency,
          precision: updated.precision,
        },
        tx,
      );

      return updated;
    });

    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.refundCompleted, {
        actorId: caller.accountId,
        targetType: 'refund',
        targetId: refund.id,
        operation: 'refund-completed',
        payload: {
          invoiceId: refund.invoiceId,
          amountMinor: refund.amountMinor.toString(),
          currency: refund.currency,
        },
      }),
    );

    return this.toSummary(refund);
  }

  async list(caller: CallerContext, query: ListRefundsDto) {
    const organizationId = (await this.profile.get()).organizationId;
    const { pageSize } = normalizePageQuery(query);
    const skip = pageOffset(query);

    const search = query.search
      ? normalizeArabic(normalizeDigits(query.search))
      : undefined;

    const branchIds = this.scopedBranchIds(caller, query.branchIds);

    const { rows, total } = await this.repository.list(
      {
        organizationId,
        ...(search ? { search } : {}),
        ...(branchIds ? { branchIds } : {}),
        ...(query.statuses?.length
          ? {
              statuses: query.statuses.map(
                (s) => s.toUpperCase() as FinanceRefundStatus,
              ),
            }
          : {}),
        ...(query.dateFrom ? { dateFrom: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { dateTo: new Date(query.dateTo) } : {}),
      },
      {
        field: (query.sortBy ?? 'refundDate') as RefundSortField,
        direction: query.sortOrder === 'asc' ? 'asc' : 'desc',
      },
      { skip, take: pageSize },
    );

    return createPageResult(
      rows.map((row) => this.toSummary(row)),
      total,
      query,
    );
  }

  private assertTransition(from: FinanceRefundStatus, to: RefundStatus): void {
    if (!this.lifecycle.isTransitionAllowed(from as RefundStatus, to)) {
      throw new FinanceValidationException([
        { field: 'status', message: `${from} → ${to}` },
      ]);
    }
  }

  private assertNotFuture(dateOnly: string): void {
    if (dateOnly > new Date().toISOString().slice(0, 10)) {
      throw new FinanceValidationException([
        { field: 'refundDate', message: 'must not be in the future' },
      ]);
    }
  }

  private scopedBranchIds(
    caller: CallerContext,
    requested?: string[],
  ): string[] | undefined {
    if (caller.organizationWide) return requested?.length ? requested : undefined;
    const allowed = caller.authorizedBranchIds;
    if (!requested?.length) return allowed;
    return requested.filter((id) => allowed.includes(id));
  }

  private toSummary(refund: Refund): RefundSummaryDto {
    return {
      id: refund.id,
      paymentId: refund.paymentId,
      invoiceId: refund.invoiceId,
      amount: fromMinorUnits(
        refund.amountMinor,
        refund.currency,
        refund.precision,
      ),
      reason: refund.reason,
      refundDate: refund.refundDate.toISOString().slice(0, 10),
      status: toWireStatus(refund.status),
      requestedBy: { id: refund.requestedById, name: refund.requestedByName },
      requestedAt: refund.requestedAt.toISOString(),
      ...(refund.decidedById && refund.decidedByName
        ? { decidedBy: { id: refund.decidedById, name: refund.decidedByName } }
        : {}),
      ...(refund.decidedAt ? { decidedAt: refund.decidedAt.toISOString() } : {}),
      ...(refund.decisionReason
        ? { decisionReason: refund.decisionReason }
        : {}),
      ...(refund.completedAt
        ? { completedAt: refund.completedAt.toISOString() }
        : {}),
      version: refund.version,
    };
  }
}
