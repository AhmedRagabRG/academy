import { httpClient, type QueryValue } from "@/shared/api"
import type { Cursor, InvoiceId, Paginated, RefundId } from "../types/common"
import type {
  FinanceLookups,
  FinanceTimelineEvent,
  Payment,
} from "../types/domain"
import type {
  AccountingContext,
  FinanceDashboardSummary,
  InstallmentSummary,
  InvoiceDetail,
  InvoiceSummary,
  PaymentSummary,
  RefundSummary,
  StudentFinancialProfile,
} from "../types/projections"
import type {
  ApplyDiscountCommand,
  AwardScholarshipCommand,
  CancelInvoiceCommand,
  CompleteRefundCommand,
  DecideRefundCommand,
  FinanceDashboardQuery,
  FinanceTimelineQuery,
  GenerateInstallmentPlanCommand,
  InstallmentListQuery,
  InvoiceListQuery,
  IssueInvoiceCommand,
  PaymentListQuery,
  RaiseInvoicesCommand,
  RecordPaymentCommand,
  RefundListQuery,
  RequestRefundCommand,
  UpdateDraftInvoiceCommand,
} from "../types/commands"
import { guard } from "./finance-api-error"
import {
  labelsFrom,
  toAccountingContext,
  toDashboardSummary,
  toInstallmentSummary,
  toInvoiceDetail,
  toInvoiceSummary,
  toLookups,
  toPaginated,
  toPayment,
  toPaymentSummary,
  toRefundSummary,
  toStudentProfile,
  toTimelinePage,
  type ApiAccountingContext,
  type ApiFinanceLookups,
  type ApiInstallmentRow,
  type ApiInvoiceDetail,
  type ApiInvoiceRow,
  type ApiPaymentRow,
  type ApiRefundRow,
  type ApiStudentProfile,
  type ApiTimelineEvent,
  type Labels,
} from "./finance-mapper"
import type { StudentFinanceService } from "./student-finance-service"

/**
 * Lookups are read once per session and shared.
 *
 * Every queue needs them to turn a `branchId` or `paymentMethodId` into the
 * label its table renders, so fetching per list would mean a second round trip
 * on every page change for data that does not move. The promise is cached
 * rather than the value, so concurrent first calls share one request; a
 * rejection is dropped so the next caller retries instead of caching a failure.
 */
let lookupsPromise: Promise<FinanceLookups> | undefined

function readLookups(signal?: AbortSignal): Promise<FinanceLookups> {
  if (!lookupsPromise) {
    lookupsPromise = httpClient
      .get<ApiFinanceLookups>("/finance/lookups", undefined, signal)
      .then(toLookups)
      .catch((error: unknown) => {
        lookupsPromise = undefined
        throw error
      })
  }
  return lookupsPromise
}

/** Clears the cached lookups. Used by tests between cases. */
export function resetFinanceLookupsCache(): void {
  lookupsPromise = undefined
}

/**
 * Labels for a list render.
 *
 * A lookups failure must not fail the list itself: the rows are still correct
 * and useful, so the labels degrade to a dash rather than the whole queue
 * erroring on a secondary read.
 */
async function labels(signal?: AbortSignal): Promise<Labels> {
  try {
    return labelsFrom(await readLookups(signal))
  } catch {
    const { emptyLabels } = await import("./finance-mapper")
    return emptyLabels
  }
}

const range = (
  dateRange: { from?: string; to?: string } | undefined
): Record<string, QueryValue> =>
  dateRange
    ? {
        ...(dateRange.from ? { dateFrom: dateRange.from } : {}),
        ...(dateRange.to ? { dateTo: dateRange.to } : {}),
      }
    : {}

const invoiceParams = (
  query: Omit<InvoiceListQuery, "page" | "pageSize" | "sort"> &
    Partial<Pick<InvoiceListQuery, "page" | "pageSize" | "sort">>
): Record<string, QueryValue> => ({
  ...(query.page !== undefined ? { page: query.page } : {}),
  ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
  ...(query.search ? { search: query.search } : {}),
  ...(query.branchIds?.length ? { branchIds: query.branchIds } : {}),
  // The API filters by a single student on this route, so a multi-select
  // narrows to its first value rather than being dropped silently.
  ...(query.studentIds?.length ? { studentId: query.studentIds[0] } : {}),
  ...(query.statuses?.length ? { statuses: query.statuses } : {}),
  ...(query.sort
    ? { sortBy: query.sort.field, sortOrder: query.sort.direction }
    : {}),
})

export const httpStudentFinanceService: StudentFinanceService = {
  async listInvoices(
    query: InvoiceListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<InvoiceSummary>> {
    return guard(async () => {
      const [page, resolved] = await Promise.all([
        httpClient.getPage<ApiInvoiceRow>(
          "/finance/invoices",
          invoiceParams(query),
          signal
        ),
        labels(signal),
      ])
      return toPaginated(page, (row) => toInvoiceSummary(row, resolved))
    })
  },

  async getInvoice(
    invoiceId: InvoiceId,
    signal?: AbortSignal
  ): Promise<InvoiceDetail> {
    return guard(async () => {
      const [record, payments] = await Promise.all([
        httpClient.get<ApiInvoiceDetail>(
          `/finance/invoices/${invoiceId}`,
          undefined,
          signal
        ),
        this.listInvoicePayments(invoiceId, signal),
      ])
      return toInvoiceDetail(record, payments)
    })
  },

  async listPayments(
    query: PaymentListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<PaymentSummary>> {
    return guard(async () => {
      const [page, resolved] = await Promise.all([
        httpClient.getPage<ApiPaymentRow>(
          "/finance/payments",
          {
            page: query.page,
            pageSize: query.pageSize,
            ...(query.search ? { search: query.search } : {}),
            ...(query.branchIds?.length ? { branchIds: query.branchIds } : {}),
            ...(query.studentIds?.length
              ? { studentIds: query.studentIds }
              : {}),
            ...(query.methodIds?.length ? { methodIds: query.methodIds } : {}),
            ...range(query.dateRange),
            ...(query.sort
              ? { sortBy: query.sort.field, sortOrder: query.sort.direction }
              : {}),
          },
          signal
        ),
        labels(signal),
      ])
      return toPaginated(page, (row) => toPaymentSummary(row, resolved))
    })
  },

  async listInstallments(
    query: InstallmentListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<InstallmentSummary>> {
    return guard(async () => {
      const [page, resolved] = await Promise.all([
        httpClient.getPage<ApiInstallmentRow>(
          "/finance/installments",
          {
            page: query.page,
            pageSize: query.pageSize,
            ...(query.search ? { search: query.search } : {}),
            ...(query.branchIds?.length ? { branchIds: query.branchIds } : {}),
            ...(query.statuses?.length ? { statuses: query.statuses } : {}),
            ...range(query.dateRange),
            ...(query.sort
              ? { sortBy: query.sort.field, sortOrder: query.sort.direction }
              : {}),
          },
          signal
        ),
        labels(signal),
      ])
      return toPaginated(page, (row) => toInstallmentSummary(row, resolved))
    })
  },

  async listRefunds(
    query: RefundListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<RefundSummary>> {
    return guard(async () => {
      const [page, resolved] = await Promise.all([
        httpClient.getPage<ApiRefundRow>(
          "/finance/refunds",
          {
            page: query.page,
            pageSize: query.pageSize,
            ...(query.search ? { search: query.search } : {}),
            ...(query.branchIds?.length ? { branchIds: query.branchIds } : {}),
            ...(query.statuses?.length ? { statuses: query.statuses } : {}),
            ...range(query.dateRange),
            ...(query.sort
              ? { sortBy: query.sort.field, sortOrder: query.sort.direction }
              : {}),
          },
          signal
        ),
        labels(signal),
      ])
      return toPaginated(page, (row) => toRefundSummary(row, resolved))
    })
  },

  async getDashboardSummary(
    query: FinanceDashboardQuery,
    signal?: AbortSignal
  ): Promise<FinanceDashboardSummary> {
    return guard(async () =>
      toDashboardSummary(
        await httpClient.get<Parameters<typeof toDashboardSummary>[0]>(
          "/finance/dashboard/summary",
          invoiceParams(query),
          signal
        )
      )
    )
  },

  async getStudentFinancialProfile(
    studentId: string,
    signal?: AbortSignal
  ): Promise<StudentFinancialProfile> {
    return guard(async () =>
      toStudentProfile(
        await httpClient.get<ApiStudentProfile>(
          `/finance/students/${studentId}/profile`,
          undefined,
          signal
        )
      )
    )
  },

  async listTimeline(
    studentId: string,
    query: FinanceTimelineQuery,
    signal?: AbortSignal
  ): Promise<Cursor<FinanceTimelineEvent>> {
    return guard(async () =>
      toTimelinePage(
        await httpClient.get<{
          items: ApiTimelineEvent[]
          nextCursor?: string | null
        }>(
          `/finance/students/${studentId}/timeline`,
          {
            limit: query.limit,
            ...(query.cursor ? { cursor: query.cursor } : {}),
            ...(query.categories?.length
              ? { categories: query.categories }
              : {}),
          },
          signal
        ),
        studentId
      )
    )
  },

  async listInvoicePayments(
    invoiceId: InvoiceId,
    signal?: AbortSignal
  ): Promise<Payment[]> {
    return guard(async () => {
      const [page, resolved] = await Promise.all([
        httpClient.getPage<ApiPaymentRow>(
          "/finance/payments",
          { invoiceId, page: 1, pageSize: 100 },
          signal
        ),
        labels(signal),
      ])
      return page.items.map((row) => toPayment(row, resolved))
    })
  },

  async lookups(signal?: AbortSignal): Promise<FinanceLookups> {
    return guard(async () => readLookups(signal))
  },

  async getAccountingContext(
    query: InvoiceListQuery,
    signal?: AbortSignal
  ): Promise<AccountingContext> {
    return guard(async () =>
      toAccountingContext(
        await httpClient.get<ApiAccountingContext>(
          "/finance/accounting-context",
          invoiceParams(query),
          signal
        )
      )
    )
  },

  async exportInvoices(
    query: InvoiceListQuery,
    signal?: AbortSignal
  ): Promise<string> {
    return guard(async () => {
      const body = await httpClient.getText(
        "/finance/invoices/export",
        invoiceParams(query),
        signal
      )
      // The route declares CSV but the global envelope interceptor may still
      // wrap it, exactly as the students export does. Unwrapping conditionally
      // works either way.
      try {
        const envelope: unknown = JSON.parse(body)
        if (
          typeof envelope === "object" &&
          envelope !== null &&
          typeof (envelope as { data?: unknown }).data === "string"
        )
          return (envelope as { data: string }).data
      } catch {
        // Not JSON — already the CSV payload.
      }
      return body
    })
  },

  async raiseInvoices(
    command: RaiseInvoicesCommand
  ): Promise<InvoiceSummary[]> {
    return guard(async () => {
      const [rows, resolved] = await Promise.all([
        httpClient.post<ApiInvoiceDetail[] | null>("/finance/invoices", {
          enrollmentId: command.enrollmentId,
          purposes: command.purposes?.length ? command.purposes : ["tuition"],
        }),
        labels(),
      ])
      // The raise returns full records; the caller wants queue rows, and every
      // summary field is present on the detail.
      return (rows ?? []).map((row) =>
        toInvoiceSummary(
          {
            ...row,
            finalAmount: row.derived.finalAmount,
            paidAmount: row.derived.netPaid,
            remaining: row.derived.remaining,
          },
          resolved
        )
      )
    })
  },

  async updateDraftInvoice(
    command: UpdateDraftInvoiceCommand
  ): Promise<InvoiceDetail> {
    return guard(async () => {
      await httpClient.patch(`/finance/invoices/${command.invoiceId}`, {
        input: {
          totalAmount: command.input.totalAmount,
          dueDate: command.input.dueDate,
          ...(command.input.discount ? { discount: command.input.discount } : {}),
          ...(command.input.scholarship
            ? { scholarship: command.input.scholarship }
            : {}),
        },
        expectedVersion: command.expectedVersion,
      })
      return this.getInvoice(command.invoiceId)
    })
  },

  async issueInvoice(command: IssueInvoiceCommand): Promise<InvoiceDetail> {
    return guard(async () => {
      await httpClient.post(`/finance/invoices/${command.invoiceId}/issue`, {
        expectedVersion: command.expectedVersion,
      })
      return this.getInvoice(command.invoiceId)
    })
  },

  async cancelInvoice(command: CancelInvoiceCommand): Promise<InvoiceDetail> {
    return guard(async () => {
      await httpClient.post(`/finance/invoices/${command.invoiceId}/cancel`, {
        reason: command.reason,
        expectedVersion: command.expectedVersion,
      })
      return this.getInvoice(command.invoiceId)
    })
  },

  async generateInstallmentPlan(
    command: GenerateInstallmentPlanCommand
  ): Promise<InvoiceDetail> {
    return guard(async () => {
      await httpClient.post(
        `/finance/invoices/${command.invoiceId}/installment-plan`,
        {
          count: command.count,
          scheduleBasis: command.scheduleBasis,
          firstDueDate: command.firstDueDate,
          ...(command.customDueDates?.length
            ? { customDueDates: command.customDueDates }
            : {}),
          expectedVersion: command.expectedVersion,
        }
      )
      return this.getInvoice(command.invoiceId)
    })
  },

  async getInstallmentPolicy(invoiceId, signal) {
    return guard(() =>
      httpClient.get(`/finance/invoices/${invoiceId}/installment-policy`, undefined, signal)
    )
  },

  async recordPayment(command: RecordPaymentCommand): Promise<PaymentSummary> {
    return guard(async () => {
      const [row, resolved] = await Promise.all([
        httpClient.post<ApiPaymentRow>("/finance/payments", {
          invoiceId: command.invoiceId,
          ...(command.installmentId
            ? { installmentId: command.installmentId }
            : {}),
          methodId: command.methodId,
          paymentDate: command.paymentDate,
          amount: command.amount,
          ...(command.notes ? { notes: command.notes } : {}),
          expectedVersion: command.expectedVersion,
        }),
        labels(),
      ])
      return toPaymentSummary(row, resolved)
    })
  },

  async applyDiscount(command: ApplyDiscountCommand): Promise<InvoiceDetail> {
    return guard(async () => {
      await httpClient.post(`/finance/invoices/${command.invoiceId}/discounts`, {
        kind: command.kind,
        value: command.value,
        reason: command.reason,
        expectedVersion: command.expectedVersion,
      })
      return this.getInvoice(command.invoiceId)
    })
  },

  async awardScholarship(
    command: AwardScholarshipCommand
  ): Promise<StudentFinancialProfile> {
    return guard(async () => {
      await httpClient.post("/finance/scholarships", {
        studentId: command.studentId,
        ...(command.enrollmentId ? { enrollmentId: command.enrollmentId } : {}),
        name: command.name,
        kind: command.kind,
        value: command.value,
        coverage: command.coverage,
        reason: command.reason,
      })
      return this.getStudentFinancialProfile(command.studentId)
    })
  },

  async requestRefund(command: RequestRefundCommand): Promise<RefundSummary> {
    return guard(async () => {
      const [row, resolved] = await Promise.all([
        httpClient.post<ApiRefundRow>("/finance/refunds", {
          paymentId: command.paymentId,
          amount: command.amount,
          reason: command.reason,
          refundDate: command.refundDate,
        }),
        labels(),
      ])
      return toRefundSummary(row, resolved)
    })
  },

  async decideRefund(command: DecideRefundCommand): Promise<RefundSummary> {
    return guard(async () => {
      const [row, resolved] = await Promise.all([
        httpClient.patch<ApiRefundRow>(
          `/finance/refunds/${command.refundId}/decision`,
          {
            decision: command.decision,
            ...(command.reason ? { reason: command.reason } : {}),
            expectedVersion: command.expectedVersion,
          }
        ),
        labels(),
      ])
      return toRefundSummary(row, resolved)
    })
  },

  async completeRefund(command: CompleteRefundCommand): Promise<RefundSummary> {
    return guard(async () => {
      const [row, resolved] = await Promise.all([
        httpClient.post<ApiRefundRow>(
          `/finance/refunds/${command.refundId}/complete`,
          { expectedVersion: command.expectedVersion }
        ),
        labels(),
      ])
      return toRefundSummary(row, resolved)
    })
  },
}

export type { RefundId }
