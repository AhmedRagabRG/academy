import { Injectable } from '@nestjs/common';
import type { FinanceScheduleBasis } from '../../../../prisma/generated/client';
import { BranchScopeService } from '../../../core/authorization/branch-scope.service';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  FinanceValidationException,
  FinanceVersionConflictException,
  InstallmentsNotPermittedException,
  InvoiceNotFoundException,
  PlanHasPaymentsException,
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
import { FinanceBalanceRepository } from '../balances/finance-balance.repository';
import { FinanceBalanceService } from '../balances/finance-balance.service';
import {
  FINANCE_EVENT_NAMES,
  financeEvent,
} from '../events/student-finance.events';
import { InvoiceRepository } from '../invoices/invoice.repository';
import { FinanceTimelineService } from '../statements/finance-timeline.service';
import type {
  GenerateInstallmentPlanDto,
  ListInstallmentsDto,
} from './dto/generate-installment-plan.dto';
import { InstallmentAllocationPolicy } from './installment-allocation.policy';
import { InstallmentSchedulePolicy } from './installment-schedule.policy';
import {
  InstallmentRepository,
  type InstallmentSortField,
} from './installment.repository';

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

@Injectable()
export class InstallmentService {
  constructor(
    private readonly repository: InstallmentRepository,
    private readonly invoices: InvoiceRepository,
    private readonly balances: FinanceBalanceService,
    private readonly balanceRepository: FinanceBalanceRepository,
    private readonly allocation: InstallmentAllocationPolicy,
    private readonly schedule: InstallmentSchedulePolicy,
    private readonly timeline: FinanceTimelineService,
    private readonly events: DomainEventBus,
    private readonly transactions: TransactionManager,
    private readonly branchScope: BranchScopeService,
    private readonly profile: OrganizationProfileService,
  ) {}

  /**
   * Generates a plan whose parts sum to the invoice total exactly. Amounts
   * divide equally in minor units with the remainder on the final
   * installment, so no rounding gap can appear between the plan and the
   * invoice it pays off.
   */
  async generatePlan(
    caller: CallerContext,
    invoiceId: string,
    dto: GenerateInstallmentPlanDto,
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

      const productPolicy = await this.schedule.policyForOffering(
        invoice.offeringId,
        invoice.offeringKind,
      );
      if (!productPolicy?.installmentAvailable) {
        throw new InstallmentsNotPermittedException();
      }
      if (
        dto.count < productPolicy.installmentMinCount ||
        dto.count > productPolicy.installmentMaxCount
      ) {
        throw new FinanceValidationException([
          {
            field: 'count',
            message: `must be between ${productPolicy.installmentMinCount} and ${productPolicy.installmentMaxCount}`,
          },
        ]);
      }

      const requiredFrequency = this.schedule.toWireFrequency(
        productPolicy.installmentFrequency,
      );
      if (dto.scheduleBasis !== requiredFrequency)
        throw new FinanceValidationException([
          { field: 'scheduleBasis', message: `must be ${requiredFrequency}` },
        ]);

      // Replacing a plan is refused once any installment carries a payment,
      // because the payment is allocated to a row that would disappear.
      const existing = await this.repository.findPlanByInvoiceId(invoiceId, tx);
      if (existing) {
        const paid = await this.repository.countPaymentsForPlan(existing.id, tx);
        if (paid > 0) throw new PlanHasPaymentsException();
        await this.repository.deletePlanCascade(existing.id, tx);
      }

      const dueDates = this.resolveDueDates(dto);
      if (dueDates.length !== dto.count) {
        throw new FinanceValidationException([
          { field: 'customDueDates', message: 'must supply one date per installment' },
        ]);
      }

      const balance = await this.balances.rawForInvoice(invoiceId, tx);
      const { installments: amounts } = this.allocation.allocate(
        balance.finalMinor,
        dto.count,
      );

      const plan = await this.repository.createPlan(
        {
          invoiceId,
          count: dto.count,
          scheduleBasis: dto.scheduleBasis.toUpperCase() as FinanceScheduleBasis,
          firstDueDate: new Date(dueDates[0] as string),
          generatedById: caller.accountId,
          generatedByName: caller.displayName,
        },
        tx,
      );

      await this.repository.createInstallments(
        amounts.map((amountMinor, index) => ({
          planId: plan.id,
          invoiceId,
          sequence: index + 1,
          dueDate: new Date(dueDates[index] as string),
          amountMinor,
        })),
        tx,
      );

      await this.timeline.record(
        {
          organizationId,
          studentId: invoice.studentId,
          invoiceId,
          category: 'installment-plan-generated',
          actorId: caller.accountId,
          actorName: caller.displayName,
          subjectRef: plan.id,
        },
        tx,
      );

      return { plan, invoice };
    });

    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.installmentPlanGenerated, {
        actorId: caller.accountId,
        targetType: 'installment-plan',
        targetId: result.plan.id,
        operation: 'installment-plan-generated',
        payload: { invoiceId, count: dto.count },
      }),
    );

    return this.readPlan(invoiceId);
  }

  /** Plan detail with each installment's derived paid/remaining/status. */
  async readPlan(invoiceId: string) {
    const plan = await this.repository.findPlanByInvoiceId(invoiceId);
    if (!plan) return null;

    const rows = await this.repository.findInstallmentsByPlanId(plan.id);
    const derived = await this.balanceRepository.forInstallments(invoiceId);
    const byId = new Map(derived.map((d) => [d.installment_id, d]));
    const balance = await this.balances.rawForInvoice(invoiceId);

    return {
      id: plan.id,
      invoiceId,
      count: plan.count,
      scheduleBasis: plan.scheduleBasis.toLowerCase(),
      firstDueDate: dateOnly(plan.firstDueDate),
      generatedBy: { id: plan.generatedById, name: plan.generatedByName },
      generatedAt: plan.generatedAt.toISOString(),
      installments: rows.map((row) => {
        const d = byId.get(row.id);
        return {
          id: row.id,
          sequence: row.sequence,
          dueDate: dateOnly(row.dueDate),
          amount: fromMinorUnits(
            row.amountMinor,
            balance.currency,
            balance.precision,
          ),
          paidAmount: fromMinorUnits(
            d?.paid_minor ?? 0n,
            balance.currency,
            balance.precision,
          ),
          remaining: fromMinorUnits(
            d?.remaining_minor ?? row.amountMinor,
            balance.currency,
            balance.precision,
          ),
          status: this.balanceRepository.toInstallmentStatus(
            d?.derived_status ?? 'PENDING',
          ),
        };
      }),
    };
  }

  async readPolicy(caller: CallerContext, invoiceId: string) {
    const organizationId = (await this.profile.get()).organizationId;
    const invoice = await this.invoices.findDetail(invoiceId, organizationId);
    if (!invoice) throw new InvoiceNotFoundException();
    this.branchScope.assertInScope(caller, invoice.branchId);
    const policy = await this.schedule.policyForOffering(
      invoice.offeringId,
      invoice.offeringKind,
    );
    return policy
      ? {
          available: policy.installmentAvailable,
          minCount: policy.installmentMinCount,
          maxCount: policy.installmentMaxCount,
          frequency: this.schedule.toWireFrequency(policy.installmentFrequency),
        }
      : { available: false, minCount: 1, maxCount: 1, frequency: 'monthly' };
  }

  /** `GET /finance/installments` — the cross-invoice queue. */
  async list(caller: CallerContext, query: ListInstallmentsDto) {
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
        ...(query.dateFrom ? { dueFrom: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { dueTo: new Date(query.dateTo) } : {}),
      },
      {
        field: (query.sortBy ?? 'dueDate') as InstallmentSortField,
        direction: query.sortOrder === 'desc' ? 'desc' : 'asc',
      },
      { skip, take: pageSize },
    );

    // One derived-balance lookup per invoice on the page, not per row.
    const invoiceIds = [...new Set(rows.map((r) => r.invoiceId))];
    const derivedByInstallment = new Map<
      string,
      { paid_minor: bigint; remaining_minor: bigint; derived_status: string }
    >();
    for (const invoiceId of invoiceIds) {
      for (const d of await this.balanceRepository.forInstallments(invoiceId)) {
        derivedByInstallment.set(d.installment_id, d);
      }
    }

    const items = rows
      .map((row) => {
        const d = derivedByInstallment.get(row.id);
        const status = this.balanceRepository.toInstallmentStatus(
          d?.derived_status ?? 'PENDING',
        );
        return {
          id: row.id,
          invoiceId: row.invoiceId,
          invoiceNumber: row.invoice.invoiceNumber,
          studentId: row.invoice.studentId,
          studentCode: row.invoice.studentCode,
          studentName: row.invoice.studentName,
          branchId: row.invoice.branchId,
          sequence: row.sequence,
          dueDate: dateOnly(row.dueDate),
          amount: fromMinorUnits(
            row.amountMinor,
            row.invoice.currency,
            row.invoice.precision,
          ),
          paidAmount: fromMinorUnits(
            d?.paid_minor ?? 0n,
            row.invoice.currency,
            row.invoice.precision,
          ),
          remaining: fromMinorUnits(
            d?.remaining_minor ?? row.amountMinor,
            row.invoice.currency,
            row.invoice.precision,
          ),
          status,
        };
      })
      // Status is derived, so it cannot be a SQL predicate; filtering here
      // keeps the published status and the filter consistent.
      .filter((item) =>
        query.statuses?.length ? query.statuses.includes(item.status) : true,
      );

    return createPageResult(items, total, query);
  }

  private resolveDueDates(dto: GenerateInstallmentPlanDto): string[] {
    if (dto.scheduleBasis === 'custom') {
      return [...(dto.customDueDates ?? [])].sort();
    }
    const first = dto.firstDueDate;
    if (!first) {
      throw new FinanceValidationException([
        { field: 'firstDueDate', message: 'required for a monthly schedule' },
      ]);
    }
    return this.schedule.generateRecurringDueDates(
      first,
      dto.count,
      dto.scheduleBasis as 'weekly' | 'monthly' | 'bimonthly',
    );
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
}
