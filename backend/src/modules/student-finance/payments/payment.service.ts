import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { BranchScopeService } from '../../../core/authorization/branch-scope.service';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  FinanceValidationException,
  FinanceVersionConflictException,
  InvoiceNotFoundException,
  PaymentNotFoundException,
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
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { FINANCE_PAYMENT_METHOD_GROUP } from '../types/student-finance.types';
import { FinanceBalanceService } from '../balances/finance-balance.service';
import { FinanceMoneyPolicy } from '../balances/finance-money.policy';
import {
  FINANCE_EVENT_NAMES,
  financeEvent,
} from '../events/student-finance.events';
import { PaymentMapper, type PaymentResponseDto } from '../mappers/payment.mapper';
import { FinanceNumberingService } from '../numbering/finance-numbering.service';
import { FinanceTimelineService } from '../statements/finance-timeline.service';
import { InvoiceRepository } from '../invoices/invoice.repository';
import type { ListPaymentsDto } from './dto/list-payments.dto';
import type { RecordPaymentDto } from './dto/record-payment.dto';
import { PaymentPolicy } from './payment.policy';
import { PaymentRepository, type PaymentSortField } from './payment.repository';

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

@Injectable()
export class PaymentService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly invoices: InvoiceRepository,
    private readonly balances: FinanceBalanceService,
    private readonly numbering: FinanceNumberingService,
    private readonly policy: PaymentPolicy,
    private readonly money: FinanceMoneyPolicy,
    private readonly timeline: FinanceTimelineService,
    private readonly mapper: PaymentMapper,
    private readonly events: DomainEventBus,
    private readonly transactions: TransactionManager,
    private readonly branchScope: BranchScopeService,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
    private readonly profile: OrganizationProfileService,
  ) {}

  /**
   * Records an immutable payment. Every figure that decides whether the
   * payment is legal — remaining balance, installment remaining, invoice
   * status — is re-read inside the serializable transaction, because a
   * balance the client computed is stale by the time it arrives.
   */
  async record(
    caller: CallerContext,
    dto: RecordPaymentDto,
  ): Promise<PaymentResponseDto> {
    const organizationId = await this.resolveOrganizationId();

    const payment = await this.transactions.runSerializable(async (tx) => {
      const invoice = await this.invoices.findDetail(
        dto.invoiceId,
        organizationId,
        tx,
      );
      if (!invoice) throw new InvoiceNotFoundException();

      this.branchScope.assertInScope(caller, invoice.branchId);

      // Compare-and-swap: the version the client saw must still be current.
      if (invoice.version !== dto.expectedVersion) {
        throw new FinanceVersionConflictException(invoice.version);
      }

      const amountMinor = this.money.toPositiveMinor(
        dto.amount,
        invoice.currency,
        invoice.precision,
      );

      this.policy.validatePositiveAmount(amountMinor);
      this.policy.validateInvoicePayable(invoice.status);
      this.policy.validateNonFutureDate(dto.paymentDate);
      if (invoice.issueDate) {
        this.policy.validatePaymentDateNotBeforeIssueDate(
          dto.paymentDate,
          dateOnly(invoice.issueDate),
        );
      }
      this.policy.validateNotes(dto.notes);

      const method = await this.organization.resolveValue(
        FINANCE_PAYMENT_METHOD_GROUP,
        dto.methodId,
      );
      if (!method) throw new FinanceValidationException();
      this.policy.validateMethodActivity(method.active);

      // Read the balance from the view inside this transaction, so the check
      // and the write see the same snapshot.
      await this.balances.assertPaymentWithinBalance(invoice.id, amountMinor, tx);

      if (dto.installmentId) {
        await this.balances.assertWithinInstallmentRemaining(
          dto.installmentId,
          amountMinor,
          invoice.currency,
          invoice.precision,
          tx,
        );
      }

      const receiptNumber = await this.numbering.allocate(
        organizationId,
        'receipt',
        new Date().getUTCFullYear(),
        tx,
      );

      const created = await this.repository.create(
        {
          organizationId,
          receiptNumber,
          studentId: invoice.studentId,
          invoiceId: invoice.id,
          installmentId: dto.installmentId ?? null,
          branchId: invoice.branchId,
          methodId: dto.methodId,
          paymentDate: new Date(dto.paymentDate),
          amountMinor,
          currency: invoice.currency,
          precision: invoice.precision,
          notes: dto.notes ?? null,
          recordedById: caller.accountId,
          recordedByName: caller.displayName,
        },
        tx,
      );

      // A payment changes what the invoice detail reports.
      await this.repository.incrementInvoiceVersion(invoice.id, tx);

      await this.timeline.record(
        {
          organizationId,
          studentId: invoice.studentId,
          invoiceId: invoice.id,
          category: 'payment-received',
          actorId: caller.accountId,
          actorName: caller.displayName,
          subjectRef: created.id,
          amountMinor,
          currency: invoice.currency,
          precision: invoice.precision,
        },
        tx,
      );

      return created;
    });

    // Emitted only after commit — an audit trail must never describe a write
    // that rolled back.
    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.paymentRecorded, {
        actorId: caller.accountId,
        targetType: 'payment',
        targetId: payment.id,
        operation: 'payment-recorded',
        payload: {
          invoiceId: payment.invoiceId,
          receiptNumber: payment.receiptNumber,
          amountMinor: payment.amountMinor.toString(),
          currency: payment.currency,
        },
      }),
    );

    return this.mapper.toResponse(payment);
  }

  /** `GET /finance/payments` — branch-scoped, paged, sorted. */
  async list(caller: CallerContext, query: ListPaymentsDto) {
    const organizationId = await this.resolveOrganizationId();
    const { pageSize } = normalizePageQuery(query);
    const skip = pageOffset(query);

    const search = query.search
      ? normalizeArabic(normalizeDigits(query.search))
      : undefined;

    const { rows, total } = await this.repository.list(
      {
        organizationId,
        ...(search ? { search } : {}),
        ...(() => {
          const branchIds = this.scopedBranchIds(caller, query.branchIds);
          return branchIds ? { branchIds } : {};
        })(),
        ...(query.studentIds?.length ? { studentIds: query.studentIds } : {}),
        ...(query.methodIds?.length ? { methodIds: query.methodIds } : {}),
        ...(query.dateFrom ? { dateFrom: new Date(query.dateFrom) } : {}),
        ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
        ...(query.dateTo ? { dateTo: new Date(query.dateTo) } : {}),
      },
      {
        field: (query.sortBy ?? 'paymentDate') as PaymentSortField,
        direction: query.sortOrder === 'asc' ? 'asc' : 'desc',
      },
      { skip, take: pageSize },
    );

    return createPageResult(this.mapper.toList(rows), total, query);
  }

  async getById(
    caller: CallerContext,
    paymentId: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.repository.findById(paymentId);
    if (!payment) throw new PaymentNotFoundException();
    this.branchScope.assertInScope(caller, payment.branchId);
    return this.mapper.toResponse(payment);
  }

  listByInvoice(invoiceId: string): Promise<PaymentResponseDto[]> {
    return this.repository
      .findByInvoiceId(invoiceId)
      .then((rows) => this.mapper.toList(rows));
  }

  private async resolveOrganizationId(): Promise<string> {
    return (await this.profile.get()).organizationId;
  }

  /**
   * Intersects the caller's authorized branches with any explicit filter, so a
   * branch filter can narrow the caller's scope but never widen it.
   */
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
