export type Brand<T, Name extends string> = T & { readonly __brand: Name }

export type InvoiceId = Brand<string, "InvoiceId">
export type InstallmentPlanId = Brand<string, "InstallmentPlanId">
export type InstallmentId = Brand<string, "InstallmentId">
export type PaymentId = Brand<string, "PaymentId">
export type DiscountId = Brand<string, "DiscountId">
export type ScholarshipId = Brand<string, "ScholarshipId">
export type AdjustmentId = Brand<string, "AdjustmentId">
export type RefundId = Brand<string, "RefundId">
export type FinanceEventId = Brand<string, "FinanceEventId">

export type { Money } from "@/shared/utils/money"

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially-paid"
  | "paid"
  | "cancelled"

export type InstallmentStatus =
  | "pending"
  | "partially-paid"
  | "paid"
  | "overdue"

export type FinancialStatus =
  | "no-outstanding-balance"
  | "partial-balance"
  | "overdue"
  | "completed"

export type RefundStatus =
  | "requested"
  | "approved"
  | "completed"
  | "rejected"
  | "cancelled"

export type ReductionKind = "percentage" | "amount"

export type ScholarshipCoverage = "full-tuition" | "partial-tuition"

export type ScheduleBasis = "weekly" | "monthly" | "bimonthly" | "custom"

export type OfferingKind =
  | "professional-program"
  | "professional-diploma"
  | "training-course"

export type FinanceEventCategory =
  | "invoice-created"
  | "invoice-issued"
  | "invoice-cancelled"
  | "installment-plan-generated"
  | "payment-received"
  | "discount-applied"
  | "scholarship-applied"
  | "adjustment-recorded"
  | "refund-requested"
  | "refund-completed"

export interface ActorRef {
  id: string
  name: string
  active: boolean
}

export interface LookupOption {
  value: string
  label: string
  active: boolean
}

export interface AuditContext {
  createdAt: string
  createdBy: ActorRef
  updatedAt: string
  updatedBy: ActorRef
  /** Optimistic-concurrency token carried by every command. */
  version: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface Cursor<T> {
  items: T[]
  nextCursor?: string
}

export interface DateRange {
  field: string
  from?: string
  to?: string
}

/** Injected so overdue derivation is deterministic in tests (research R10). */
export type Clock = () => string
