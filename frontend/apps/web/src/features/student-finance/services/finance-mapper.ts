import type { Page } from "@/shared/api"
import type { Money } from "@/shared/utils/money"
import type {
  ActorRef,
  Cursor,
  FinanceEventCategory,
  InstallmentId,
  InstallmentStatus,
  InvoiceId,
  InvoiceStatus,
  LookupOption,
  OfferingKind,
  Paginated,
  PaymentId,
  RefundId,
  RefundStatus,
} from "../types/common"
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

/**
 * The wire shapes the finance API returns.
 *
 * Declared separately from the domain types because the two differ in two
 * consistent ways: the API identifies a lookup by `id` where the domain calls it
 * `value`, and it sends `branchId`/`paymentMethodId` where the screens render a
 * label. Neither is a field the API is missing — the labels live in
 * `/finance/lookups`, which is why `Labels` below exists.
 */

export interface ApiMoney {
  amount: string
  currency: string
  precision: number
}

export interface ApiActor {
  id: string
  name: string
  active?: boolean
}

export interface ApiLookupOption {
  id: string
  code?: string
  label: string
  active: boolean
}

export interface ApiInvoiceRow {
  id: string
  invoiceNumber: string
  studentId: string
  studentCode: string
  studentName: string
  offeringLabel: string
  batchLabel?: string | null
  branchId: string
  purpose: string
  issueDate?: string | null
  dueDate: string
  finalAmount: ApiMoney
  paidAmount: ApiMoney
  remaining: ApiMoney
  status: InvoiceStatus
  isOverdue: boolean
  updatedAt: string
  version: number
}

export interface ApiInvoiceFigures {
  totalAmount: ApiMoney
  discountTotal: ApiMoney
  scholarshipTotal: ApiMoney
  finalAmount: ApiMoney
}

export interface ApiInvoiceDetail extends Omit<ApiInvoiceRow, "finalAmount" | "paidAmount" | "remaining"> {
  organizationId: string
  enrollmentId: string
  offeringId: string
  offeringKind: OfferingKind
  batchId?: string | null
  currency: string
  precision: number
  draft: ApiInvoiceFigures
  issuedSnapshot?: ApiInvoiceFigures | null
  statusHistory: {
    fromStatus: InvoiceStatus | null
    toStatus: InvoiceStatus
    reason?: string | null
    actor: ApiActor
    occurredAt: string
  }[]
  cancelledAt?: string | null
  cancelReason?: string | null
  derived: {
    finalAmount: ApiMoney
    netPaid: ApiMoney
    remaining: ApiMoney
    status: InvoiceStatus
    isOverdue: boolean
  }
  permissions: InvoiceDetail["permissions"]
  createdAt: string
  createdBy: ApiActor
  updatedBy: ApiActor
}

export interface ApiPaymentRow {
  id: string
  invoiceId: string
  invoiceNumber?: string
  studentId?: string
  studentCode?: string
  studentName?: string
  installmentId?: string | null
  receiptNumber: string
  amount: ApiMoney
  paymentDate: string
  paymentMethodId: string
  notes?: string | null
  recordedAt: string
  recordedBy: ApiActor
}

export interface ApiInstallmentRow {
  id: string
  invoiceId: string
  invoiceNumber: string
  studentId: string
  studentCode: string
  studentName: string
  branchId: string
  sequence: number
  dueDate: string
  amount: ApiMoney
  paidAmount: ApiMoney
  remaining: ApiMoney
  status: InstallmentStatus
}

export interface ApiRefundRow {
  id: string
  paymentId: string
  invoiceId: string
  invoiceNumber?: string
  receiptNumber?: string
  studentId?: string
  studentCode?: string
  studentName?: string
  branchId?: string
  amount: ApiMoney
  reason: string
  refundDate: string
  status: RefundStatus
  requestedBy: ApiActor
  requestedAt: string
  decidedBy?: ApiActor | null
  decidedAt?: string | null
  decisionReason?: string | null
  completedAt?: string | null
  version: number
}

export interface ApiFinanceLookups {
  paymentMethods: ApiLookupOption[]
  chargePurposes: ApiLookupOption[]
  branches: ApiLookupOption[]
  offerings: ApiLookupOption[]
  batches: ApiLookupOption[]
  invoiceStatuses: string[]
  refundStatuses: string[]
  installmentEligibility: FinanceLookups["installmentEligibility"]
  discountPolicy: FinanceLookups["discountPolicy"]
  scholarshipPolicy: FinanceLookups["scholarshipPolicy"]
  numbering: FinanceLookups["numbering"]
  duePolicy: FinanceLookups["duePolicy"]
  currency: string
  precision: number
}

export interface ApiTimelineEvent {
  id: string
  category: FinanceEventCategory
  occurredAt: string
  summary: string
  invoiceId?: string | null
  subjectRef?: string | null
  amount?: ApiMoney | null
  actor?: ApiActor | null
}

/**
 * Label lookups the row endpoints do not carry.
 *
 * The queues send `branchId` and `paymentMethodId`; the tables render names.
 * Resolving here rather than per-screen keeps one source for the fallback when
 * a lookup has been archived and no longer resolves.
 */
export interface Labels {
  branch: (id: string | null | undefined) => string
  method: (id: string | null | undefined) => string
}

export const emptyLabels: Labels = { branch: () => "—", method: () => "—" }

export function labelsFrom(lookups: FinanceLookups): Labels {
  const branches = new Map(lookups.branches.map((b) => [b.value, b.label]))
  const methods = new Map(lookups.paymentMethods.map((m) => [m.id, m.label]))
  return {
    branch: (id) => (id ? (branches.get(id) ?? "—") : "—"),
    method: (id) => (id ? (methods.get(id) ?? "—") : "—"),
  }
}

const money = (value: ApiMoney): Money => ({
  amount: value.amount,
  currency: value.currency,
  precision: value.precision,
})

/** The API omits `active` on some actors; a named actor is present by definition. */
const actor = (value: ApiActor): ActorRef => ({
  id: value.id,
  name: value.name,
  active: value.active ?? true,
})

const optional = <T,>(value: T | null | undefined): T | undefined =>
  value ?? undefined

const option = (row: ApiLookupOption): LookupOption => ({
  value: row.id,
  label: row.label,
  active: row.active,
})

export function toPaginated<TApi, TDomain>(
  page: Page<TApi>,
  map: (row: TApi) => TDomain
): Paginated<TDomain> {
  return {
    items: page.items.map(map),
    total: page.meta.total,
    page: page.meta.page,
    pageSize: page.meta.limit,
    totalPages: page.meta.totalPages,
  }
}

export const toInvoiceSummary = (
  row: ApiInvoiceRow,
  labels: Labels
): InvoiceSummary => ({
  id: row.id as InvoiceId,
  invoiceNumber: row.invoiceNumber,
  studentId: row.studentId,
  studentCode: row.studentCode,
  studentName: row.studentName,
  offeringLabel: row.offeringLabel,
  ...(row.batchLabel ? { batchLabel: row.batchLabel } : {}),
  branchId: row.branchId,
  branchLabel: labels.branch(row.branchId),
  ...(row.issueDate ? { issueDate: row.issueDate } : {}),
  dueDate: row.dueDate,
  finalAmount: money(row.finalAmount),
  paidAmount: money(row.paidAmount),
  remaining: money(row.remaining),
  status: row.status,
  updatedAt: row.updatedAt,
  version: row.version,
})

export const toPaymentSummary = (
  row: ApiPaymentRow,
  labels: Labels
): PaymentSummary => ({
  id: row.id as PaymentId,
  receiptNumber: row.receiptNumber,
  studentId: row.studentId ?? "",
  studentCode: row.studentCode ?? "",
  studentName: row.studentName ?? "",
  invoiceId: row.invoiceId as InvoiceId,
  invoiceNumber: row.invoiceNumber ?? "",
  // The payment row carries no branch of its own; the queue shows the method
  // instead, and the branch column falls back rather than inventing one.
  branchLabel: "—",
  methodId: row.paymentMethodId,
  methodLabel: labels.method(row.paymentMethodId),
  paymentDate: row.paymentDate,
  amount: money(row.amount),
  recordedByName: row.recordedBy.name,
})

export const toPayment = (row: ApiPaymentRow, labels: Labels): Payment => ({
  id: row.id as PaymentId,
  organizationId: "",
  receiptNumber: row.receiptNumber,
  studentId: row.studentId ?? "",
  invoiceId: row.invoiceId as InvoiceId,
  ...(row.installmentId
    ? { installmentId: row.installmentId as InstallmentId }
    : {}),
  branchId: "",
  methodId: row.paymentMethodId,
  methodLabel: labels.method(row.paymentMethodId),
  paymentDate: row.paymentDate,
  amount: money(row.amount),
  ...(row.notes ? { notes: row.notes } : {}),
  recordedAt: row.recordedAt,
  recordedBy: actor(row.recordedBy),
})

export const toInstallmentSummary = (
  row: ApiInstallmentRow,
  labels: Labels
): InstallmentSummary => ({
  id: row.id as InstallmentId,
  invoiceId: row.invoiceId as InvoiceId,
  invoiceNumber: row.invoiceNumber,
  studentCode: row.studentCode,
  studentName: row.studentName,
  branchLabel: labels.branch(row.branchId),
  sequence: row.sequence,
  dueDate: row.dueDate,
  amount: money(row.amount),
  paidAmount: money(row.paidAmount),
  remaining: money(row.remaining),
  status: row.status,
})

export const toRefundSummary = (
  row: ApiRefundRow,
  labels: Labels
): RefundSummary => ({
  id: row.id as RefundId,
  paymentId: row.paymentId as PaymentId,
  receiptNumber: row.receiptNumber ?? "",
  invoiceId: row.invoiceId as InvoiceId,
  invoiceNumber: row.invoiceNumber ?? "",
  studentId: row.studentId ?? "",
  studentCode: row.studentCode ?? "",
  studentName: row.studentName ?? "",
  branchLabel: labels.branch(row.branchId),
  amount: money(row.amount),
  refundDate: row.refundDate,
  status: row.status,
  requestedByName: row.requestedBy.name,
  ...(row.decidedBy ? { approvedByName: row.decidedBy.name } : {}),
  version: row.version,
})

const figures = (value: ApiInvoiceFigures) => ({
  totalAmount: money(value.totalAmount),
  discountTotal: money(value.discountTotal),
  scholarshipTotal: money(value.scholarshipTotal),
  finalAmount: money(value.finalAmount),
})

/**
 * The invoice record.
 *
 * The detail route returns the aggregate and its derived balance but not the
 * related collections, so `payments` is supplied by the caller from the
 * payments queue. The remaining collections have no read of their own yet and
 * are empty rather than fabricated — an empty list is the honest answer to "the
 * API does not publish this", and every consumer already renders that state.
 */
export const toInvoiceDetail = (
  row: ApiInvoiceDetail,
  payments: Payment[]
): InvoiceDetail => ({
  id: row.id as InvoiceId,
  organizationId: row.organizationId,
  invoiceNumber: row.invoiceNumber,
  studentId: row.studentId,
  studentCode: row.studentCode,
  studentName: row.studentName,
  enrollmentId: row.enrollmentId,
  branchId: row.branchId,
  offeringId: row.offeringId,
  offeringLabel: row.offeringLabel,
  offeringKind: row.offeringKind,
  ...(row.batchId ? { batchId: row.batchId } : {}),
  ...(row.batchLabel ? { batchLabel: row.batchLabel } : {}),
  purpose: row.purpose,
  ...(row.issueDate ? { issueDate: row.issueDate } : {}),
  dueDate: row.dueDate,
  currency: row.currency,
  precision: row.precision,
  draft: figures(row.draft),
  ...(row.issuedSnapshot ? { issuedSnapshot: figures(row.issuedSnapshot) } : {}),
  status: row.status,
  statusHistory: (row.statusHistory ?? []).map((entry) => ({
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    ...(entry.reason ? { reason: entry.reason } : {}),
    actor: actor(entry.actor),
    occurredAt: entry.occurredAt,
  })),
  ...(row.cancelledAt ? { cancelledAt: row.cancelledAt } : {}),
  ...(row.cancelReason ? { cancelReason: row.cancelReason } : {}),
  installments: [],
  payments,
  discounts: [],
  scholarships: [],
  adjustments: [],
  refunds: [],
  derived: {
    finalAmount: money(row.derived.finalAmount),
    netPaid: money(row.derived.netPaid),
    remaining: money(row.derived.remaining),
    status: row.derived.status,
  },
  permissions: row.permissions,
  version: row.version,
  createdAt: row.createdAt,
  createdBy: actor(row.createdBy),
  updatedAt: row.updatedAt,
  updatedBy: actor(row.updatedBy),
})

export const toDashboardSummary = (row: {
  invoiced: ApiMoney
  collected: ApiMoney
  outstanding: ApiMoney
  unsettledInvoices: number
  hasNoRecords: boolean
  asOf: string
}): FinanceDashboardSummary => ({
  invoiced: money(row.invoiced),
  collected: money(row.collected),
  outstanding: money(row.outstanding),
  unsettledInvoices: row.unsettledInvoices,
  hasNoRecords: row.hasNoRecords,
  asOf: row.asOf,
})

export interface ApiStudentProfile {
  studentId: string
  studentCode?: string
  studentName?: string
  currency?: string
  precision?: number
  totals: {
    totalFees: ApiMoney
    paidAmount: ApiMoney
    remainingBalance: ApiMoney
  }
  outstandingInstallments: number
  financialStatus: StudentFinancialProfile["financialStatus"]
  scholarships: {
    id: string
    name: string
    value: string
    kind: "percentage" | "amount"
    coverage: "full-tuition" | "partial-tuition"
    approvedBy?: ApiActor | null
    approvedByName?: string | null
    approvedAt: string
  }[]
  discounts: {
    id: string
    invoiceNumber?: string
    value: string
    kind: "percentage" | "amount"
    reason: string
    approvedBy?: ApiActor | null
    approvedByName?: string | null
    approvedAt: string
  }[]
  perEnrollment: {
    enrollmentId: string
    offeringLabel: string
    offeringKind?: OfferingKind
    batchLabel?: string | null
    totalFees: ApiMoney
    paidAmount: ApiMoney
    remainingBalance: ApiMoney
    status?: StudentFinancialProfile["financialStatus"]
  }[]
  hasNoRecords: boolean
  asOf: string
}

export const toStudentProfile = (
  row: ApiStudentProfile
): StudentFinancialProfile => ({
  studentId: row.studentId,
  studentCode: row.studentCode ?? "",
  studentName: row.studentName ?? "",
  currency: row.currency ?? row.totals.totalFees.currency,
  precision: row.precision ?? row.totals.totalFees.precision,
  totals: {
    totalFees: money(row.totals.totalFees),
    paidAmount: money(row.totals.paidAmount),
    remainingBalance: money(row.totals.remainingBalance),
  },
  outstandingInstallments: row.outstandingInstallments,
  scholarships: (row.scholarships ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    value: s.value,
    kind: s.kind,
    coverage: s.coverage,
    approvedByName: s.approvedBy?.name ?? s.approvedByName ?? "",
    approvedAt: s.approvedAt,
  })),
  discounts: (row.discounts ?? []).map((d) => ({
    id: d.id,
    invoiceNumber: d.invoiceNumber ?? "",
    value: d.value,
    kind: d.kind,
    reason: d.reason,
    approvedByName: d.approvedBy?.name ?? d.approvedByName ?? "",
    approvedAt: d.approvedAt,
  })),
  financialStatus: row.financialStatus,
  perEnrollment: (row.perEnrollment ?? []).map((e) => ({
    enrollmentId: e.enrollmentId,
    offeringLabel: e.offeringLabel,
    offeringKind: e.offeringKind ?? "professional-program",
    ...(e.batchLabel ? { batchLabel: e.batchLabel } : {}),
    totalFees: money(e.totalFees),
    paidAmount: money(e.paidAmount),
    remaining: money(e.remainingBalance),
    status: e.status ?? row.financialStatus,
  })),
  hasNoRecords: row.hasNoRecords,
  asOf: row.asOf,
})

export const toTimelinePage = (
  page: { items: ApiTimelineEvent[]; nextCursor?: string | null },
  studentId: string
): Cursor<FinanceTimelineEvent> => ({
  items: (page.items ?? []).map((row, index) => ({
    id: row.id as FinanceTimelineEvent["id"],
    studentId,
    ...(row.invoiceId ? { invoiceId: row.invoiceId as InvoiceId } : {}),
    category: row.category,
    occurredAt: row.occurredAt,
    // The API orders the page but publishes no sequence; the index preserves
    // that order for the tiebreak the timeline renders on.
    sequence: index,
    actor: row.actor
      ? actor(row.actor)
      : { id: "", name: "—", active: true },
    ...(row.subjectRef ? { subjectRef: row.subjectRef } : {}),
    ...(row.amount ? { amount: money(row.amount) } : {}),
    summary: row.summary,
  })),
  ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
})

const statusOptions = <T extends string>(values: readonly string[]) =>
  values.map((value) => ({ value: value as T, label: value }))

export const toLookups = (row: ApiFinanceLookups): FinanceLookups => ({
  paymentMethods: (row.paymentMethods ?? []).map((m) => ({
    id: m.id,
    label: m.label,
    active: m.active,
  })),
  // Keyed by code: the raise command takes `["tuition"]`, not a lookup id.
  chargePurposes: (row.chargePurposes ?? []).map((p) => ({
    value: p.code ?? p.id,
    label: p.label,
    active: p.active,
  })),
  branches: (row.branches ?? []).map(option),
  offerings: (row.offerings ?? []).map(option),
  batches: (row.batches ?? []).map(option),
  invoiceStatuses: statusOptions<InvoiceStatus>(row.invoiceStatuses ?? []),
  refundStatuses: statusOptions<RefundStatus>(row.refundStatuses ?? []),
  installmentEligibility: row.installmentEligibility ?? [],
  discountPolicy: row.discountPolicy,
  scholarshipPolicy: row.scholarshipPolicy,
  numbering: row.numbering,
  duePolicy: row.duePolicy,
  currency: row.currency,
  precision: row.precision,
})

export interface ApiAccountingContext {
  invoices: {
    id: string
    invoiceNumber: string
    studentId: string
    enrollmentId: string
    issueDate?: string | null
    finalAmount: ApiMoney
    status: InvoiceStatus
  }[]
  payments: {
    id: string
    receiptNumber: string
    invoiceId: string
    methodId?: string
    paymentMethodId?: string
    paymentDate: string
    amount: ApiMoney
  }[]
  refunds: {
    id: string
    paymentId: string
    amount: ApiMoney
    refundDate: string
    status: RefundStatus
  }[]
  asOf: string
  currency: string
  precision: number
}

export const toAccountingContext = (
  row: ApiAccountingContext
): AccountingContext => ({
  invoices: (row.invoices ?? []).map((i) => ({
    id: i.id as InvoiceId,
    invoiceNumber: i.invoiceNumber,
    studentId: i.studentId,
    enrollmentId: i.enrollmentId,
    ...(optional(i.issueDate) ? { issueDate: i.issueDate as string } : {}),
    finalAmount: money(i.finalAmount),
    status: i.status,
  })),
  payments: (row.payments ?? []).map((p) => ({
    id: p.id as PaymentId,
    receiptNumber: p.receiptNumber,
    invoiceId: p.invoiceId as InvoiceId,
    methodId: p.methodId ?? p.paymentMethodId ?? "",
    paymentDate: p.paymentDate,
    amount: money(p.amount),
  })),
  refunds: (row.refunds ?? []).map((r) => ({
    id: r.id as RefundId,
    paymentId: r.paymentId as PaymentId,
    amount: money(r.amount),
    refundDate: r.refundDate,
    status: r.status,
  })),
  asOf: row.asOf,
  currency: row.currency,
  precision: row.precision,
})
