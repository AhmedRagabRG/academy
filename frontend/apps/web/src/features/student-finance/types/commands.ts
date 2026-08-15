import type {
  DateRange,
  FinanceEventCategory,
  InstallmentId,
  InstallmentStatus,
  InvoiceId,
  InvoiceStatus,
  PaymentId,
  ReductionKind,
  RefundId,
  RefundStatus,
  ScheduleBasis,
  ScholarshipCoverage,
} from "./common"

export type InvoiceSortField =
  | "invoiceNumber"
  | "dueDate"
  | "finalAmount"
  | "remaining"
  | "updatedAt"

export interface InvoiceListQuery {
  search?: string
  branchIds?: string[]
  studentIds?: string[]
  offeringIds?: string[]
  statuses?: InvoiceStatus[]
  dateRange?: DateRange & { field: "issueDate" | "dueDate" }
  sort?: { field: InvoiceSortField; direction: "asc" | "desc" }
  page: number
  pageSize: number
}

export interface PaymentListQuery {
  search?: string
  branchIds?: string[]
  studentIds?: string[]
  methodIds?: string[]
  dateRange?: DateRange & { field: "paymentDate" }
  sort?: { field: "receiptNumber" | "paymentDate" | "amount"; direction: "asc" | "desc" }
  page: number
  pageSize: number
}

export interface InstallmentListQuery {
  search?: string
  branchIds?: string[]
  statuses?: InstallmentStatus[]
  dateRange?: DateRange & { field: "dueDate" }
  sort?: { field: "dueDate" | "amount" | "sequence"; direction: "asc" | "desc" }
  page: number
  pageSize: number
}

export interface RefundListQuery {
  search?: string
  branchIds?: string[]
  statuses?: RefundStatus[]
  dateRange?: DateRange & { field: "refundDate" }
  sort?: { field: "refundDate" | "amount"; direction: "asc" | "desc" }
  page: number
  pageSize: number
}

/**
 * The dashboard reads the same filter surface as the invoice queue, minus paging
 * and sorting — the totals cover every matching invoice, so a page has no meaning.
 */
export type FinanceDashboardQuery = Omit<
  InvoiceListQuery,
  "page" | "pageSize" | "sort"
>

export interface FinanceTimelineQuery {
  cursor?: string
  limit: number
  categories?: FinanceEventCategory[]
}

export interface DraftInvoiceInput {
  /** Decimal string at the configured precision. */
  totalAmount: string
  dueDate: string
  discount?: { kind: ReductionKind; value: string }
  scholarship?: { kind: ReductionKind; value: string }
}

/** Idempotent on `(enrollmentId, purpose)` — repeats reuse the existing invoices. */
export interface RaiseInvoicesCommand {
  enrollmentId: string
  purposes?: string[]
}

export interface UpdateDraftInvoiceCommand {
  invoiceId: InvoiceId
  input: DraftInvoiceInput
  expectedVersion: number
}

export interface IssueInvoiceCommand {
  invoiceId: InvoiceId
  expectedVersion: number
}

export interface CancelInvoiceCommand {
  invoiceId: InvoiceId
  reason: string
  expectedVersion: number
}

export interface GenerateInstallmentPlanCommand {
  invoiceId: InvoiceId
  count: number
  scheduleBasis: ScheduleBasis
  firstDueDate: string
  customDueDates?: string[]
  expectedVersion: number
}

export interface RecordPaymentCommand {
  invoiceId: InvoiceId
  installmentId?: InstallmentId
  methodId: string
  paymentDate: string
  /** Decimal string. Re-checked against the remaining balance inside the service. */
  amount: string
  notes?: string
  expectedVersion: number
}

export interface ApplyDiscountCommand {
  invoiceId: InvoiceId
  kind: ReductionKind
  value: string
  reason: string
  expectedVersion: number
}

export interface AwardScholarshipCommand {
  studentId: string
  enrollmentId?: string
  name: string
  kind: ReductionKind
  value: string
  coverage: ScholarshipCoverage
  reason: string
}

export interface RequestRefundCommand {
  paymentId: PaymentId
  amount: string
  reason: string
  refundDate: string
}

export interface DecideRefundCommand {
  refundId: RefundId
  decision: "approved" | "rejected"
  reason?: string
  expectedVersion: number
}

export interface CompleteRefundCommand {
  refundId: RefundId
  expectedVersion: number
}
