import type {
  Cursor,
  InvoiceId,
  Paginated,
  RefundId,
} from "../types/common"
import type { FinanceLookups, FinanceTimelineEvent, Payment } from "../types/domain"
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

/**
 * The Student Finance service facade.
 *
 * Note what is deliberately absent and must stay absent:
 *
 * - **no delete** on any entity — cancellation and status changes are the only
 *   reversals (spec FR-001);
 * - **no update or delete on `Payment`** — corrections go through a refund
 *   (spec FR-019);
 * - **no write to `issuedSnapshot`** — post-issuance reductions become adjustments
 *   (spec FR-007).
 *
 * A contract test asserts this surface, so a future contributor cannot quietly add
 * one of these operations.
 */
export interface StudentFinanceService {
  // Reads
  listInvoices(
    query: InvoiceListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<InvoiceSummary>>
  getInvoice(invoiceId: InvoiceId, signal?: AbortSignal): Promise<InvoiceDetail>
  getInstallmentPolicy(
    invoiceId: InvoiceId,
    signal?: AbortSignal
  ): Promise<InstallmentPolicy>
  listPayments(
    query: PaymentListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<PaymentSummary>>
  listInstallments(
    query: InstallmentListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<InstallmentSummary>>
  listRefunds(
    query: RefundListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<RefundSummary>>
  /**
   * Collection totals over every invoice matching the filters.
   *
   * Its own read rather than something a screen derives from `listInvoices`: a
   * list is paged, and totals computed from one page are not totals.
   */
  getDashboardSummary(
    query: FinanceDashboardQuery,
    signal?: AbortSignal
  ): Promise<FinanceDashboardSummary>
  getStudentFinancialProfile(
    studentId: string,
    signal?: AbortSignal
  ): Promise<StudentFinancialProfile>
  listTimeline(
    studentId: string,
    query: FinanceTimelineQuery,
    signal?: AbortSignal
  ): Promise<Cursor<FinanceTimelineEvent>>
  listInvoicePayments(
    invoiceId: InvoiceId,
    signal?: AbortSignal
  ): Promise<Payment[]>
  lookups(signal?: AbortSignal): Promise<FinanceLookups>
  getAccountingContext(
    query: InvoiceListQuery,
    signal?: AbortSignal
  ): Promise<AccountingContext>
  exportInvoices(query: InvoiceListQuery, signal?: AbortSignal): Promise<string>

  // Commands
  raiseInvoices(command: RaiseInvoicesCommand): Promise<InvoiceSummary[]>
  updateDraftInvoice(command: UpdateDraftInvoiceCommand): Promise<InvoiceDetail>
  issueInvoice(command: IssueInvoiceCommand): Promise<InvoiceDetail>
  cancelInvoice(command: CancelInvoiceCommand): Promise<InvoiceDetail>
  generateInstallmentPlan(
    command: GenerateInstallmentPlanCommand
  ): Promise<InvoiceDetail>
  recordPayment(command: RecordPaymentCommand): Promise<PaymentSummary>
  applyDiscount(command: ApplyDiscountCommand): Promise<InvoiceDetail>
  awardScholarship(
    command: AwardScholarshipCommand
  ): Promise<StudentFinancialProfile>
  requestRefund(command: RequestRefundCommand): Promise<RefundSummary>
  decideRefund(command: DecideRefundCommand): Promise<RefundSummary>
  completeRefund(command: CompleteRefundCommand): Promise<RefundSummary>
}

export interface InstallmentPolicy {
  available: boolean
  minCount: number
  maxCount: number
  frequency: Exclude<import("../types/common").ScheduleBasis, "custom">
}

export type { RefundId }
