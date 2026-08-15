import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { BranchScopeService } from '../../../core/authorization/branch-scope.service';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  FinanceValidationException,
  InvoiceNotFoundException,
} from '../../../core/exceptions/student-finance.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { StudentFinancialAccountService } from '../accounts/student-financial-account.service';
import { FinanceBalanceService } from '../balances/finance-balance.service';
import { FinanceMoneyPolicy } from '../balances/finance-money.policy';
import {
  FINANCE_EVENT_NAMES,
  financeEvent,
} from '../events/student-finance.events';
import { InvoiceMapper } from '../mappers/invoice.mapper';
import type { FinanceInvoiceStatus } from '../../../../prisma/generated/client';
import { createPageResult, normalizePageQuery } from '../../../shared/pagination/pagination.helper';
import { normalizeArabic, normalizeDigits } from '../../../shared/utils/arabic-normalize';
import type { ListInvoicesDto } from './dto/list-invoices.dto';
import { FinanceNumberingService } from '../numbering/finance-numbering.service';
import {
  FINANCE_CHARGE_PURPOSE_GROUP,
  type FinanceEventCategory,
} from '../types/student-finance.types';
import type { RaiseInvoicesDto } from './dto/raise-invoices.dto';
import type {
  CancelInvoiceDto,
  ExpectedVersionDto,
  UpdateDraftInvoiceDto,
} from './dto/update-draft-invoice.dto';
import { InvoiceDraftPolicy } from './invoice-draft.policy';
import { InvoiceLifecyclePolicy } from './invoice-lifecycle.policy';
import { InvoiceRepository } from './invoice.repository';

const TIMELINE_SUMMARIES: Partial<Record<FinanceEventCategory, string>> = {
  'invoice-created': 'تم إنشاء فاتورة',
  'invoice-issued': 'تم إصدار الفاتورة',
  'invoice-cancelled': 'تم إلغاء الفاتورة',
};

/** The wire spelling back to the stored enum; the mapper only goes outward. */
const toStoredStatus = (value: string): FinanceInvoiceStatus =>
  value.toUpperCase().replaceAll('-', '_') as FinanceInvoiceStatus;

@Injectable()
export class InvoiceService {
  constructor(
    private readonly repository: InvoiceRepository,
    private readonly accounts: StudentFinancialAccountService,
    private readonly balances: FinanceBalanceService,
    private readonly money: FinanceMoneyPolicy,
    private readonly draft: InvoiceDraftPolicy,
    private readonly lifecycle: InvoiceLifecyclePolicy,
    private readonly numbering: FinanceNumberingService,
    private readonly mapper: InvoiceMapper,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
    private readonly scope: BranchScopeService,
    private readonly profile: OrganizationProfileService,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly masterData: OrganizationMasterDataPort,
  ) {}

  /**
   * Raises one invoice per requested purpose from the enrollment's immutable
   * snapshot. Idempotent on `(enrollmentId, purpose)`: a repeat returns the
   * existing invoices and allocates no new number.
   */
  async raise(dto: RaiseInvoicesDto, caller: CallerContext) {
    const snapshot = await this.accounts.requireSnapshot(dto.enrollmentId);
    const account = await this.accounts.requireAccountById(snapshot.accountId);
    this.scope.assertInScope(caller, snapshot.branchId);

    const organizationId = (await this.profile.get()).organizationId;
    const purposes = await this.resolvePurposes(dto.purposes);
    const year = new Date().getUTCFullYear();

    const ids = await this.transactions.runSerializable(async (tx) => {
      const raised: string[] = [];
      for (const purpose of purposes) {
        // Every purpose is charged the enrollment's required amount by
        // default; a non-tuition charge is then adjusted on the draft before
        // issuance.
        const totalMinor =
          purpose.code === 'tuition'
            ? snapshot.requiredAmountMinor
            : purpose.code === 'registration-fee'
              ? snapshot.registrationFeesMinor
              : 0n;

        const figures = this.draft.compute({
          totalMinor,
          currency: snapshot.currency,
          precision: snapshot.precision,
        });

        // Allocate the number only when the row is actually new; an
        // idempotent repeat must not consume a number.
        const existing = await this.repository.findByEnrollmentAndPurpose(
          dto.enrollmentId,
          purpose.id,
          tx,
        );
        if (existing) {
          raised.push(existing.id);
          continue;
        }

        const invoiceNumber = await this.numbering.allocate(
          organizationId,
          'invoice',
          year,
          tx,
        );
        const result = await this.repository.raise(
          {
            organizationId,
            invoiceNumber,
            accountId: snapshot.accountId,
            studentId: account.studentId,
            studentCode: account.studentCode,
            studentName: account.studentName,
            searchName: account.searchName,
            enrollmentId: dto.enrollmentId,
            branchId: snapshot.branchId,
            offeringId: snapshot.offeringId,
            offeringLabel: snapshot.offeringLabel,
            offeringKind: snapshot.offeringKind,
            batchId: snapshot.batchId,
            batchLabel: snapshot.batchLabel,
            chargePurposeValueId: purpose.id,
            chargePurposeCode: purpose.code,
            dueDate: new Date(
              this.draft.resolveDueDate(undefined, new Date(), 30),
            ),
            currency: snapshot.currency,
            precision: snapshot.precision,
            draftTotalMinor: figures.totalMinor,
            draftDiscountTotalMinor: figures.discountTotalMinor,
            draftScholarshipTotalMinor: figures.scholarshipTotalMinor,
            draftFinalMinor: figures.finalMinor,
            actorId: caller.accountId,
            actorName: caller.displayName,
          },
          tx,
        );
        if (result.created) {
          await this.appendTimeline(
            {
              organizationId,
              studentId: account.studentId,
              invoiceId: result.id,
              category: 'invoice-created',
              actorId: caller.accountId,
              actorName: caller.displayName,
              amountMinor: figures.finalMinor,
              currency: snapshot.currency,
              precision: snapshot.precision,
            },
            tx,
          );
        }
        raised.push(result.id);
      }
      return raised;
    });

    for (const id of ids) {
      this.events.emit(
        financeEvent(FINANCE_EVENT_NAMES.invoiceRaised, {
          actorId: caller.accountId,
          targetType: 'invoice',
          targetId: id,
          operation: 'raise',
          payload: { studentId: account.studentId },
        }),
      );
    }
    return Promise.all(ids.map((id) => this.detail(id, caller)));
  }

  /**
   * The invoice queue.
   *
   * Branch scope is applied as a filter rather than a per-row refusal: a list
   * narrows to what the caller may see, where a single read refuses outright.
   * Balances are resolved in one batched call so the page costs one query for
   * the rows and one for their derived figures, not one per invoice.
   */
  async list(caller: CallerContext, query: ListInvoicesDto) {
    const organizationId = (await this.profile.get()).organizationId;
    const paging = normalizePageQuery({
      ...(query.page !== undefined ? { page: query.page } : {}),
      ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
    });

    // Mirrors `BranchScopeService.applyToQuery`: an organization-wide caller
    // sees every branch, anyone else is narrowed to their authorized set, and
    // an explicit filter can only narrow further — never widen.
    const authorized = caller.organizationWide
      ? null
      : (caller.authorizedBranchIds ?? []);
    const requested = query.branchIds ?? [];
    const branchIds = authorized
      ? requested.length
        ? requested.filter((id: string) => authorized.includes(id))
        : authorized
      : requested;

    const { rows, total } = await this.repository.list(
      {
        organizationId,
        ...(query.search ? { search: this.foldSearch(query.search) } : {}),
        ...(query.statuses?.length
          ? { statuses: query.statuses.map(toStoredStatus) }
          : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(branchIds.length ? { branchIds } : {}),
        ...(query.purpose ? { purpose: query.purpose } : {}),
      },
      {
        field: query.sortBy ?? 'updatedAt',
        direction: query.sortOrder === 'asc' ? 'asc' : 'desc',
      },
      { skip: (paging.page - 1) * paging.pageSize, take: paging.pageSize },
    );

    const derived = await this.balances.forInvoices(rows.map((row) => row.id));
    const items = rows.flatMap((row) => {
      const balance = derived.get(row.id);
      return balance ? [this.mapper.toSummary(row, balance)] : [];
    });
    return createPageResult(items, total, paging);
  }

  /** Folded exactly as the stored `searchName` was, so Arabic forms match. */
  private foldSearch(term: string): string {
    return normalizeArabic(normalizeDigits(term.trim())).toLowerCase();
  }

  async detail(invoiceId: string, caller: CallerContext) {
    const organizationId = (await this.profile.get()).organizationId;
    const record = await this.repository.findDetail(invoiceId, organizationId);
    if (!record) throw new InvoiceNotFoundException();
    // A record outside the caller's scope is refused distinctly, never as a
    // generic permission failure.
    this.scope.assertInScope(caller, record.branchId);
    const derived = await this.balances.forInvoice(invoiceId);
    return this.mapper.toDetail(record, derived, caller);
  }

  /** Draft-only. Every figure is recomputed; none is accepted from the client. */
  async updateDraft(
    invoiceId: string,
    dto: UpdateDraftInvoiceDto,
    caller: CallerContext,
  ) {
    const organizationId = (await this.profile.get()).organizationId;
    const record = await this.repository.findDetail(invoiceId, organizationId);
    if (!record) throw new InvoiceNotFoundException();
    this.scope.assertInScope(caller, record.branchId);

    const derived = await this.balances.forInvoice(invoiceId);
    this.lifecycle.assertEditable(derived.status);

    const totalMinor = dto.input.totalAmount
      ? this.money.toPositiveMinor(
          dto.input.totalAmount,
          record.currency,
          record.precision,
        )
      : record.draftTotalMinor;

    const figures = this.draft.compute({
      totalMinor,
      discount: dto.input.discount,
      scholarship: dto.input.scholarship,
      currency: record.currency,
      precision: record.precision,
    });

    const dueDate = dto.input.dueDate ?? this.isoDate(record.dueDate);
    this.draft.assertDueAfterIssue(
      dueDate,
      record.issueDate ? this.isoDate(record.issueDate) : null,
    );

    await this.transactions.runSerializable(async (tx) =>
      this.repository.updateWithVersion(
        invoiceId,
        dto.expectedVersion,
        ['draft'],
        {
          draftTotalMinor: figures.totalMinor,
          draftDiscountTotalMinor: figures.discountTotalMinor,
          draftScholarshipTotalMinor: figures.scholarshipTotalMinor,
          draftFinalMinor: figures.finalMinor,
          dueDate: new Date(dueDate),
          updatedById: caller.accountId,
          updatedByName: caller.displayName,
        },
        tx,
      ),
    );

    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.invoiceUpdated, {
        actorId: caller.accountId,
        targetType: 'invoice',
        targetId: invoiceId,
        operation: 'update-draft',
        payload: { amountMinor: figures.finalMinor.toString() },
      }),
    );
    return this.detail(invoiceId, caller);
  }

  /**
   * Freezes the four figures into the issued snapshot. The snapshot is written
   * exactly once — a trigger rejects any later change to it, whatever layer
   * attempts one.
   */
  async issue(
    invoiceId: string,
    dto: ExpectedVersionDto,
    caller: CallerContext,
  ) {
    const organizationId = (await this.profile.get()).organizationId;
    const record = await this.repository.findDetail(invoiceId, organizationId);
    if (!record) throw new InvoiceNotFoundException();
    this.scope.assertInScope(caller, record.branchId);

    const derived = await this.balances.forInvoice(invoiceId);
    this.lifecycle.assertCanIssue(derived.status);

    await this.transactions.runSerializable(async (tx) => {
      const version = await this.repository.updateWithVersion(
        invoiceId,
        dto.expectedVersion,
        ['draft'],
        {
          status: 'ISSUED',
          issueDate: new Date(),
          issuedTotalMinor: record.draftTotalMinor,
          issuedDiscountTotalMinor: record.draftDiscountTotalMinor,
          issuedScholarshipTotalMinor: record.draftScholarshipTotalMinor,
          issuedFinalMinor: record.draftFinalMinor,
          updatedById: caller.accountId,
          updatedByName: caller.displayName,
        },
        tx,
      );
      await this.repository.appendStatusChange(
        {
          invoiceId,
          fromStatus: 'DRAFT',
          toStatus: 'ISSUED',
          actorId: caller.accountId,
          actorName: caller.displayName,
          resultInvoiceVersion: version,
        },
        tx,
      );
      await this.appendTimeline(
        {
          organizationId,
          studentId: record.studentId,
          invoiceId,
          category: 'invoice-issued',
          actorId: caller.accountId,
          actorName: caller.displayName,
          amountMinor: record.draftFinalMinor,
          currency: record.currency,
          precision: record.precision,
        },
        tx,
      );
    });

    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.invoiceIssued, {
        actorId: caller.accountId,
        targetType: 'invoice',
        targetId: invoiceId,
        operation: 'issue',
        payload: { fromStatus: 'draft', toStatus: 'issued' },
      }),
    );
    return this.detail(invoiceId, caller);
  }

  /** Cancellation is the only reversal; it is refused once money is collected. */
  async cancel(
    invoiceId: string,
    dto: CancelInvoiceDto,
    caller: CallerContext,
  ) {
    const organizationId = (await this.profile.get()).organizationId;
    const record = await this.repository.findDetail(invoiceId, organizationId);
    if (!record) throw new InvoiceNotFoundException();
    this.scope.assertInScope(caller, record.branchId);

    const raw = await this.balances.rawForInvoice(invoiceId);
    this.lifecycle.assertCanCancel(
      raw.derivedStatus,
      raw.collectedMinor,
      this.money.toMoney(raw.collectedMinor, record.currency, record.precision)
        .amount,
    );

    await this.transactions.runSerializable(async (tx) => {
      const version = await this.repository.updateWithVersion(
        invoiceId,
        dto.expectedVersion,
        ['draft', 'issued'],
        {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: dto.reason,
          updatedById: caller.accountId,
          updatedByName: caller.displayName,
        },
        tx,
      );
      await this.repository.appendStatusChange(
        {
          invoiceId,
          fromStatus: record.status as 'DRAFT' | 'ISSUED' | 'CANCELLED',
          toStatus: 'CANCELLED',
          reason: dto.reason,
          actorId: caller.accountId,
          actorName: caller.displayName,
          resultInvoiceVersion: version,
        },
        tx,
      );
      await this.appendTimeline(
        {
          organizationId,
          studentId: record.studentId,
          invoiceId,
          category: 'invoice-cancelled',
          actorId: caller.accountId,
          actorName: caller.displayName,
          currency: record.currency,
          precision: record.precision,
        },
        tx,
      );
    });

    this.events.emit(
      financeEvent(FINANCE_EVENT_NAMES.invoiceCancelled, {
        actorId: caller.accountId,
        targetType: 'invoice',
        targetId: invoiceId,
        operation: 'cancel',
        payload: { toStatus: 'cancelled' },
      }),
    );
    return this.detail(invoiceId, caller);
  }

  private isoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  /** Only active purposes may be charged; inactive ones stay display-only. */
  private async resolvePurposes(codes: readonly string[]) {
    const values = await this.masterData.selectableValues(
      FINANCE_CHARGE_PURPOSE_GROUP,
    );
    return codes.map((code) => {
      const match = values.find((value) => value.code === code);
      if (!match || !match.active || !match.code) {
        throw new FinanceValidationException(
          [{ field: 'purposes', message: code }],
          'غرض الرسوم غير معروف أو غير مفعّل',
        );
      }
      return { id: match.id, code: match.code };
    });
  }

  private async appendTimeline(
    input: {
      organizationId: string;
      studentId: string;
      invoiceId: string;
      category: FinanceEventCategory;
      actorId: string;
      actorName: string;
      amountMinor?: bigint;
      currency: string;
      precision: number;
    },
    tx: Prisma.TransactionClient,
  ) {
    const sequence = await this.repository.nextTimelineSequence(
      input.studentId,
      tx,
    );
    await tx.financeTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        studentId: input.studentId,
        invoiceId: input.invoiceId,
        category: this.toStoredCategory(input.category),
        sequence,
        actorId: input.actorId,
        actorName: input.actorName,
        subjectRef: input.invoiceId,
        amountMinor: input.amountMinor,
        currency: input.amountMinor === undefined ? null : input.currency,
        precision: input.amountMinor === undefined ? null : input.precision,
        summary: TIMELINE_SUMMARIES[input.category] ?? input.category,
      },
    });
  }

  private toStoredCategory(category: FinanceEventCategory) {
    return category.toUpperCase().replace(/-/g, '_') as
      'INVOICE_CREATED' | 'INVOICE_ISSUED' | 'INVOICE_CANCELLED';
  }
}
