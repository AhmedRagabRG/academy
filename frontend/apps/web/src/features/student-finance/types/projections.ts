import type { Money } from "@/shared/utils/money"
import type {
  FinancialStatus,
  InstallmentId,
  InstallmentStatus,
  InvoiceId,
  InvoiceStatus,
  OfferingKind,
  PaymentId,
  RefundId,
  RefundStatus,
} from "./common"
import type {
  Discount,
  FinancialAdjustment,
  Installment,
  InstallmentPlan,
  Invoice,
  Payment,
  Refund,
  Scholarship,
} from "./domain"

/** Narrow list row — never carries student personal data beyond name and code. */
export interface InvoiceSummary {
  id: InvoiceId
  invoiceNumber: string
  studentId: string
  studentCode: string
  studentName: string
  offeringLabel: string
  batchLabel?: string
  branchId: string
  branchLabel: string
  issueDate?: string
  dueDate: string
  finalAmount: Money
  paidAmount: Money
  remaining: Money
  status: InvoiceStatus
  updatedAt: string
  version: number
}

export interface PaymentSummary {
  id: PaymentId
  receiptNumber: string
  studentId: string
  studentCode: string
  studentName: string
  invoiceId: InvoiceId
  invoiceNumber: string
  branchLabel: string
  methodId: string
  methodLabel: string
  paymentDate: string
  amount: Money
  recordedByName: string
}

export interface InstallmentSummary {
  id: InstallmentId
  invoiceId: InvoiceId
  invoiceNumber: string
  studentCode: string
  studentName: string
  branchLabel: string
  sequence: number
  dueDate: string
  amount: Money
  paidAmount: Money
  remaining: Money
  status: InstallmentStatus
}

export interface RefundSummary {
  id: RefundId
  paymentId: PaymentId
  receiptNumber: string
  invoiceId: InvoiceId
  invoiceNumber: string
  studentId: string
  studentCode: string
  studentName: string
  branchLabel: string
  amount: Money
  refundDate: string
  status: RefundStatus
  requestedByName: string
  approvedByName?: string
  version: number
}

/** Which finance actions the acting user may take on this record. */
export interface FinanceAreaPermissions {
  view: boolean
  invoicesView: boolean
  invoicesCreate: boolean
  invoicesUpdate: boolean
  invoicesIssue: boolean
  invoicesCancel: boolean
  installmentsManage: boolean
  paymentsView: boolean
  paymentsRecord: boolean
  discountsApprove: boolean
  scholarshipsApprove: boolean
  refundsView: boolean
  refundsRecord: boolean
  refundsApprove: boolean
  timelineView: boolean
  export: boolean
}

export interface InvoiceDerived {
  finalAmount: Money
  netPaid: Money
  remaining: Money
  status: InvoiceStatus
}

export interface InstallmentView extends Installment {
  paidAmount: Money
  remaining: Money
  status: InstallmentStatus
}

export interface InvoiceDetail extends Invoice {
  plan?: InstallmentPlan
  installments: InstallmentView[]
  payments: Payment[]
  discounts: Discount[]
  scholarships: Scholarship[]
  adjustments: FinancialAdjustment[]
  refunds: Refund[]
  derived: InvoiceDerived
  permissions: FinanceAreaPermissions
}

/**
 * Collection totals across every invoice in scope.
 *
 * Derived server-side over the whole filtered set, not over a page. The dashboard
 * previously summed the first 100 rows of the invoice queue and presented the
 * result as an organization-wide figure, which was silently wrong past 100
 * invoices — the page cap is 100 and nothing indicated the truncation.
 *
 * Cancelled invoices are excluded from every figure (spec FR-009).
 */
export interface FinanceDashboardSummary {
  invoiced: Money
  collected: Money
  outstanding: Money
  /** Invoices issued or partially paid — the ones still owing money. */
  unsettledInvoices: number
  /** A fact, distinct from zeroes: no invoices exist in scope at all. */
  hasNoRecords: boolean
  asOf: string
}

export interface EnrollmentBalance {
  enrollmentId: string
  offeringLabel: string
  offeringKind: OfferingKind
  batchLabel?: string
  totalFees: Money
  paidAmount: Money
  remaining: Money
  status: FinancialStatus
}

export interface ScholarshipSummary {
  id: string
  name: string
  value: string
  kind: Scholarship["kind"]
  coverage: Scholarship["coverage"]
  approvedByName: string
  approvedAt: string
}

export interface DiscountSummary {
  id: string
  invoiceNumber: string
  value: string
  kind: Discount["kind"]
  reason: string
  approvedByName: string
  approvedAt: string
}

export interface StudentFinancialProfile {
  studentId: string
  studentCode: string
  studentName: string
  currency: string
  precision: number
  totals: {
    totalFees: Money
    paidAmount: Money
    remainingBalance: Money
  }
  outstandingInstallments: number
  scholarships: ScholarshipSummary[]
  discounts: DiscountSummary[]
  financialStatus: FinancialStatus
  perEnrollment: EnrollmentBalance[]
  /** True when the student has no financial records at all — a fact, not an absence. */
  hasNoRecords: boolean
  asOf: string
}

/**
 * Settled facts and identities only. Carries no student name, address, national
 * identifier, or notes (spec FR-048).
 */
export interface AccountingContext {
  invoices: {
    id: InvoiceId
    invoiceNumber: string
    studentId: string
    enrollmentId: string
    issueDate?: string
    finalAmount: Money
    status: InvoiceStatus
  }[]
  payments: {
    id: PaymentId
    receiptNumber: string
    invoiceId: InvoiceId
    methodId: string
    paymentDate: string
    amount: Money
  }[]
  refunds: {
    id: RefundId
    paymentId: PaymentId
    amount: Money
    refundDate: string
    status: RefundStatus
  }[]
  asOf: string
  currency: string
  precision: number
}
