import type { Money } from "@/shared/utils/money"
import type {
  ActorRef,
  AdjustmentId,
  AuditContext,
  DiscountId,
  FinanceEventCategory,
  FinanceEventId,
  InstallmentId,
  InstallmentPlanId,
  InvoiceId,
  InvoiceStatus,
  OfferingKind,
  PaymentId,
  ReductionKind,
  RefundId,
  RefundStatus,
  ScheduleBasis,
  ScholarshipCoverage,
  ScholarshipId,
} from "./common"

/** The monetary figures of an invoice at a point in time. */
export interface InvoiceFigures {
  totalAmount: Money
  discountTotal: Money
  scholarshipTotal: Money
  /** Derived by the reduction policy — never hand-entered. */
  finalAmount: Money
}

export interface InvoiceStatusChange {
  fromStatus: InvoiceStatus | null
  toStatus: InvoiceStatus
  reason?: string
  actor: ActorRef
  occurredAt: string
}

/**
 * The aggregate root. `issuedSnapshot` is written exactly once, at issuance, and
 * never again — later reductions become `FinancialAdjustment` records instead
 * (spec FR-007, research R3).
 */
export interface Invoice extends AuditContext {
  id: InvoiceId
  organizationId: string
  invoiceNumber: string
  studentId: string
  studentCode: string
  studentName: string
  enrollmentId: string
  branchId: string
  offeringId: string
  offeringLabel: string
  offeringKind: OfferingKind
  batchId?: string
  batchLabel?: string
  /** Part of the invoicing idempotency key alongside the enrollment. */
  purpose: string
  issueDate?: string
  dueDate: string
  currency: string
  precision: number

  /** Editable only while `status === "draft"`. */
  draft: InvoiceFigures
  /** Frozen at issuance. Absent until then. */
  issuedSnapshot?: InvoiceFigures

  status: InvoiceStatus
  statusHistory: InvoiceStatusChange[]
  cancelledAt?: string
  cancelReason?: string
}

export interface InstallmentPlan {
  id: InstallmentPlanId
  invoiceId: InvoiceId
  count: number
  scheduleBasis: ScheduleBasis
  firstDueDate: string
  generatedAt: string
  generatedBy: ActorRef
}

/** `paidAmount` and status are derived, never stored (research R10). */
export interface Installment {
  id: InstallmentId
  planId: InstallmentPlanId
  invoiceId: InvoiceId
  sequence: number
  dueDate: string
  amount: Money
}

/** Immutable. No update, no delete — corrections go through a refund (FR-019). */
export interface Payment {
  id: PaymentId
  organizationId: string
  receiptNumber: string
  studentId: string
  invoiceId: InvoiceId
  installmentId?: InstallmentId
  branchId: string
  methodId: string
  methodLabel: string
  paymentDate: string
  amount: Money
  notes?: string
  recordedAt: string
  recordedBy: ActorRef
}

export interface Discount {
  id: DiscountId
  invoiceId: InvoiceId
  kind: ReductionKind
  /** Percentage `0..100`, or a decimal amount. */
  value: string
  reason: string
  approvedBy: ActorRef
  approvedAt: string
}

export interface Scholarship {
  id: ScholarshipId
  studentId: string
  /** Scoped to one enrollment, or to all of them when absent. */
  enrollmentId?: string
  name: string
  kind: ReductionKind
  value: string
  coverage: ScholarshipCoverage
  reason: string
  approvedBy: ActorRef
  approvedAt: string
}

/**
 * A reduction recorded after issuance. Lowers the unpaid balance and future
 * installments without altering the issued figures (FR-023).
 */
export interface FinancialAdjustment {
  id: AdjustmentId
  invoiceId: InvoiceId
  sourceKind: "discount" | "scholarship"
  sourceId: string
  /** Always a positive reduction. */
  amount: Money
  reason: string
  approvedBy: ActorRef
  createdAt: string
}

export interface Refund {
  id: RefundId
  paymentId: PaymentId
  invoiceId: InvoiceId
  studentId: string
  amount: Money
  reason: string
  refundDate: string
  status: RefundStatus
  requestedBy: ActorRef
  requestedAt: string
  approvedBy?: ActorRef
  decidedAt?: string
  completedAt?: string
}

export interface FinanceTimelineEvent {
  id: FinanceEventId
  studentId: string
  invoiceId?: InvoiceId
  category: FinanceEventCategory
  occurredAt: string
  /** Monotonic tiebreak; part of the paging cursor. */
  sequence: number
  actor: ActorRef
  subjectRef?: string
  amount?: Money
  summary: string
}

export interface PaymentMethod {
  id: string
  label: string
  active: boolean
}

export interface DiscountPolicy {
  maxPercentage: string
  maxAmount?: Money
  requiresApproval: boolean
}

export interface ScholarshipPolicy {
  maxPercentage: string
  requiresApproval: boolean
}

export interface InstallmentEligibility {
  offeringKind: OfferingKind
  allowsPlan: boolean
  maxCount: number
}

export interface NumberingPolicy {
  invoicePrefix: string
  receiptPrefix: string
  year: number
  width: number
}

export interface DuePolicy {
  defaultDueDays: number
  overdueGraceDays: number
}

export interface FinanceLookups {
  paymentMethods: PaymentMethod[]
  /**
   * Charge purposes, keyed by the code the raise command consumes rather than
   * by the lookup's id — `purposes: ["tuition"]` is what the API accepts.
   */
  chargePurposes: import("./common").LookupOption[]
  branches: import("./common").LookupOption[]
  offerings: import("./common").LookupOption[]
  batches: import("./common").LookupOption[]
  invoiceStatuses: { value: InvoiceStatus; label: string }[]
  refundStatuses: { value: RefundStatus; label: string }[]
  installmentEligibility: InstallmentEligibility[]
  discountPolicy: DiscountPolicy
  scholarshipPolicy: ScholarshipPolicy
  numbering: NumberingPolicy
  duePolicy: DuePolicy
  currency: string
  precision: number
}
