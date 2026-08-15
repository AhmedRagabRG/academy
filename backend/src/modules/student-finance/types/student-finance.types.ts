import type { Money } from '../../../shared/types/money';

/**
 * Wire-level closed unions. These are the kebab-case values the client
 * switches on; the Prisma enums are their SCREAMING_CASE counterparts and are
 * translated only in mappers.
 */
export type InvoiceStatus =
  'draft' | 'issued' | 'partially-paid' | 'paid' | 'cancelled';

/**
 * `partially-paid` and `paid` are derivation outputs, never written by a
 * transition, and `overdue` is deliberately absent: the client's invoice
 * status filter is a closed five-value list, and overdue is a pure function of
 * due date and remaining balance (research.md R10).
 */
export type StoredInvoiceStatus = Extract<
  InvoiceStatus,
  'draft' | 'issued' | 'cancelled'
>;

export type InstallmentStatus =
  'pending' | 'partially-paid' | 'paid' | 'overdue';

export type RefundStatus =
  'requested' | 'approved' | 'completed' | 'rejected' | 'cancelled';

export type FinancialStatus =
  'no-outstanding-balance' | 'partial-balance' | 'overdue' | 'completed';

export type ReductionKind = 'percentage' | 'amount';

export type ScholarshipCoverage = 'full-tuition' | 'partial-tuition';

export type ScheduleBasis = 'monthly' | 'custom';

export type ReductionSourceKind = 'discount' | 'scholarship';

export type OfferingKind =
  'professional-program' | 'professional-diploma' | 'training-course';

export type FinanceEventCategory =
  | 'invoice-created'
  | 'invoice-issued'
  | 'invoice-cancelled'
  | 'installment-plan-generated'
  | 'payment-received'
  | 'discount-applied'
  | 'scholarship-applied'
  | 'adjustment-recorded'
  | 'refund-requested'
  | 'refund-completed';

export type FinanceSequenceKind = 'invoice' | 'receipt';

export interface ActorRef {
  id: string;
  name: string;
  active: boolean;
}

/**
 * The four figures an invoice carries twice: once as the editable draft and
 * once as the snapshot frozen at issuance. `finalAmount` is always produced by
 * the reduction policy and is never accepted from a client.
 */
export interface InvoiceFigures {
  totalAmount: Money;
  discountTotal: Money;
  scholarshipTotal: Money;
  finalAmount: Money;
}

/**
 * The derived block. Every value here comes from `finance_invoice_balance` and
 * none of it is stored — there is no second source of truth that can drift
 * from the payments and reductions that produced it.
 */
export interface DerivedInvoiceBalance {
  finalAmount: Money;
  netPaid: Money;
  remaining: Money;
  status: InvoiceStatus;
  isOverdue: boolean;
}

/** Raw minor-unit projection of one `finance_invoice_balance` row. */
export interface InvoiceBalanceRow {
  invoiceId: string;
  finalMinor: bigint;
  collectedMinor: bigint;
  refundedMinor: bigint;
  netPaidMinor: bigint;
  remainingMinor: bigint;
  derivedStatus: InvoiceStatus;
  isOverdue: boolean;
  currency: string;
  precision: number;
}

/** Aggregate over a filtered invoice set. Cancelled invoices are excluded. */
export interface InvoiceBalanceAggregate {
  invoicedMinor: bigint;
  collectedMinor: bigint;
  outstandingMinor: bigint;
  unsettledInvoices: number;
  matchedInvoices: number;
  currency: string;
  precision: number;
}

export interface DerivedInstallmentBalance {
  paidAmount: Money;
  remaining: Money;
  status: InstallmentStatus;
}

/**
 * The immutable pricing facts Finance copies once per enrollment. Read from
 * Admissions' approval snapshot at provisioning time and never refreshed, so
 * later catalog or batch pricing changes cannot reach an existing account.
 */
export interface EnrollmentFinancialSnapshotInput {
  enrollmentId: string;
  offeringId: string;
  offeringKind: OfferingKind;
  offeringLabel: string;
  batchId: string | null;
  batchLabel: string | null;
  branchId: string;
  sourceAdmissionId: string;
  sourceApprovalSnapshotId: string;
  sourceFinancialRevisionId: string;
  tuitionMinor: bigint;
  registrationFeesMinor: bigint;
  admissionDiscountMinor: bigint;
  requiredAmountMinor: bigint;
  currency: string;
  precision: number;
}

/** Bounded so a batch balance read can never become an unbounded query. */
export const FINANCE_BALANCE_BATCH_LIMIT = 100;

export const INVOICE_SORT_FIELDS = [
  'invoiceNumber',
  'dueDate',
  'finalAmount',
  'remaining',
  'updatedAt',
] as const;
export type InvoiceSortField = (typeof INVOICE_SORT_FIELDS)[number];

export const PAYMENT_SORT_FIELDS = [
  'receiptNumber',
  'paymentDate',
  'amount',
] as const;
export type PaymentSortField = (typeof PAYMENT_SORT_FIELDS)[number];

export const INSTALLMENT_SORT_FIELDS = [
  'dueDate',
  'amount',
  'sequence',
] as const;
export type InstallmentSortField = (typeof INSTALLMENT_SORT_FIELDS)[number];

export const REFUND_SORT_FIELDS = ['refundDate', 'amount'] as const;
export type RefundSortField = (typeof REFUND_SORT_FIELDS)[number];

/**
 * The complete per-record authority surface. An absent or empty permissions
 * object blanks the entire action surface of a detail screen, so every one of
 * these is computed per record rather than inferred by the client.
 */
export interface FinanceAreaPermissions {
  view: boolean;
  invoicesView: boolean;
  invoicesCreate: boolean;
  invoicesUpdate: boolean;
  invoicesIssue: boolean;
  invoicesCancel: boolean;
  installmentsManage: boolean;
  paymentsView: boolean;
  paymentsRecord: boolean;
  discountsApprove: boolean;
  scholarshipsApprove: boolean;
  refundsView: boolean;
  refundsRecord: boolean;
  refundsApprove: boolean;
  timelineView: boolean;
  export: boolean;
}

/** The 16 keys the permission catalogue already seeds for this module. */
export const FINANCE_PERMISSION_KEYS = [
  'finance.view',
  'finance.invoices.view',
  'finance.invoices.create',
  'finance.invoices.update',
  'finance.invoices.issue',
  'finance.invoices.cancel',
  'finance.installments.manage',
  'finance.payments.view',
  'finance.payments.record',
  'finance.discounts.approve',
  'finance.scholarships.approve',
  'finance.refunds.view',
  'finance.refunds.record',
  'finance.refunds.approve',
  'finance.timeline.view',
  'finance.export',
] as const;
export type FinancePermissionKey = (typeof FINANCE_PERMISSION_KEYS)[number];

/**
 * Lookup group codes owned by Organization and consumed here. Payment methods
 * reuse the group Organization already seeds rather than creating a parallel
 * finance-only list that would drift from it.
 */
export const FINANCE_CHARGE_PURPOSE_GROUP = 'charge-purposes';
export const FINANCE_PAYMENT_METHOD_GROUP = 'payment-methods';

/** The seeded charge purposes. New fee types are lookup rows, not code. */
export const SEEDED_CHARGE_PURPOSES = [
  'tuition',
  'registration-fee',
  'card-fee',
  'certificate-fee',
  'exam-fee',
  'training-fee',
  'additional-fee',
] as const;

export interface FinanceLookupOption {
  id: string;
  code: string;
  label: string;
  active: boolean;
}

export interface InstallmentEligibility {
  offeringKind: OfferingKind;
  allowsPlan: boolean;
  maxCount: number;
}

export interface DiscountPolicyConfig {
  maxPercentage: string;
  maxAmount: Money;
  requiresApproval: boolean;
}

export interface ScholarshipPolicyConfig {
  maxPercentage: string;
  requiresApproval: boolean;
}

export interface NumberingPolicyConfig {
  invoicePrefix: string;
  receiptPrefix: string;
  year: number;
  width: number;
}

export interface DuePolicyConfig {
  defaultDueDays: number;
  overdueGraceDays: number;
}
