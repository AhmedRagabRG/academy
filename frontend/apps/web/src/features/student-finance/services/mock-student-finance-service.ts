import {
  add,
  clampToZero,
  compare,
  isZero,
  makeMoney,
  min,
  subtract,
  sum,
  toMinor,
  zeroMoney,
  type Money,
} from "@/shared/utils/money"
import type {
  AdjustmentId,
  DiscountId,
  FinanceEventCategory,
  FinanceEventId,
  InstallmentId,
  InstallmentPlanId,
  InvoiceId,
  InvoiceStatus,
  Paginated,
  PaymentId,
  RefundId,
  ScholarshipId,
} from "../types/common"
import type {
  Discount,
  FinanceLookups,
  FinanceTimelineEvent,
  FinancialAdjustment,
  Installment,
  Invoice,
  Payment,
  Refund,
  Scholarship,
} from "../types/domain"
import type {
  AccountingContext,
  FinanceAreaPermissions,
  InstallmentSummary,
  InstallmentView,
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
  FinanceTimelineQuery,
  GenerateInstallmentPlanCommand,
  IssueInvoiceCommand,
  RaiseInvoicesCommand,
  RecordPaymentCommand,
  RequestRefundCommand,
  UpdateDraftInvoiceCommand,
} from "../types/commands"
import type { StudentFinanceService } from "./student-finance-service"
import { FinanceError } from "./finance-error"
import { financePermissions } from "../config/finance-permissions"
import {
  createFinanceStore,
  type FinanceStore,
} from "../data/finance-fixtures"
import {
  CURRENCY,
  PRECISION,
  batchOptions,
  financeBranches,
  financeConfiguration,
  offeringOptions,
} from "../data/finance-lookups"
import { buildScaleInvoices } from "../data/finance-scale-fixtures"
import {
  hasFinancePermission,
  isInScope,
  type FinanceServiceContext,
} from "../utils/finance-scope"
import {
  contributesToBalance,
  installmentPaid,
  installmentRemaining,
  invoiceBalance,
  studentTotals,
  type InvoiceBalance,
} from "../utils/finance-balance"
import {
  deriveFinancialStatus,
  deriveInstallmentStatus,
  deriveInvoiceStatus,
  isPayable,
  outstandingInstallmentCount,
} from "../utils/finance-status"
import {
  evaluateInvoiceTransition,
  isEditable,
  refundTransitionRule,
} from "../utils/finance-lifecycle"
import {
  computeFigures,
  resolveReduction,
  validateReduction,
  type ReductionInput,
} from "../utils/finance-reductions"
import { buildSchedule, validatePlanRequest } from "../utils/finance-installments"
import {
  formatInvoiceNumber,
  formatReceiptNumber,
} from "../utils/finance-numbering"
import { intakeIdempotencyKey } from "../utils/finance-intake-rules"
import { nextSequence, pageTimeline } from "../utils/finance-timeline"
import {
  clampPage,
  isInvertedRange,
  isWithinRange,
  normalizeInstallmentListQuery,
  normalizeInvoiceListQuery,
  normalizePaymentListQuery,
  normalizeRefundListQuery,
  normalizeSearchTerm,
} from "../utils/finance-list-query"
import {
  financeScenarios,
  scenarioContext,
  scenarioDelay,
  scenarioNow,
  shouldFail,
} from "./mock-scenario-controller"
import { financeDependencyReaders } from "./finance-dependency-adapters"

let store: FinanceStore = createFinanceStore()
let scaleLoaded = false
let idCounter = 0

const nextId = (prefix: string) => `${prefix}-${(idCounter += 1)}`
const money = (amount: string) => makeMoney(amount, CURRENCY, PRECISION)
const zero = () => zeroMoney(CURRENCY, PRECISION)
const clone = <T>(value: T): T => structuredClone(value)

/**
 * Per-entity indexes, built lazily and invalidated on every write.
 *
 * These exist from the first commit rather than being retrofitted: the equivalent
 * list path in Student Management was O(n²) until indexes were added, and this
 * module carries roughly two and a half times the record volume (research R9).
 */
let invoiceById: Map<string, Invoice> | null = null
let invoicesByStudent: Map<string, Invoice[]> | null = null
let installmentsByInvoice: Map<string, Installment[]> | null = null
let paymentsByInvoice: Map<string, Payment[]> | null = null
let refundsByInvoice: Map<string, Refund[]> | null = null
let refundsByPayment: Map<string, Refund[]> | null = null
let adjustmentsByInvoice: Map<string, FinancialAdjustment[]> | null = null
let discountsByInvoice: Map<string, Discount[]> | null = null
let scholarshipsByStudent: Map<string, Scholarship[]> | null = null
let timelineByStudent: Map<string, FinanceTimelineEvent[]> | null = null

function invalidateIndexes(): void {
  invoiceById = null
  invoicesByStudent = null
  installmentsByInvoice = null
  paymentsByInvoice = null
  refundsByInvoice = null
  refundsByPayment = null
  adjustmentsByInvoice = null
  discountsByInvoice = null
  scholarshipsByStudent = null
  timelineByStudent = null
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const index = new Map<string, T[]>()
  for (const row of rows) {
    const bucket = index.get(key(row))
    if (bucket) bucket.push(row)
    else index.set(key(row), [row])
  }
  return index
}

/**
 * Single-invoice lookup by id.
 *
 * Every list that joins a child record back to its invoice uses this. Scanning
 * `store.invoices` per row instead made the payments queue O(payments × invoices):
 * ~9.5s per call at 50,000 invoices, against a 2s budget (SC-010).
 */
const invoiceOf = (invoiceId: string): Invoice | undefined => {
  invoiceById ??= new Map(store.invoices.map((row) => [row.id, row]))
  return invoiceById.get(invoiceId)
}

const invoicesOf = (studentId: string) => {
  invoicesByStudent ??= groupBy(store.invoices, (row) => row.studentId)
  return invoicesByStudent.get(studentId) ?? []
}
const installmentsOf = (invoiceId: InvoiceId) => {
  installmentsByInvoice ??= groupBy(store.installments, (row) => row.invoiceId)
  return installmentsByInvoice.get(invoiceId) ?? []
}
const paymentsOf = (invoiceId: InvoiceId) => {
  paymentsByInvoice ??= groupBy(store.payments, (row) => row.invoiceId)
  return paymentsByInvoice.get(invoiceId) ?? []
}
const refundsOf = (invoiceId: InvoiceId) => {
  refundsByInvoice ??= groupBy(store.refunds, (row) => row.invoiceId)
  return refundsByInvoice.get(invoiceId) ?? []
}
const refundsOfPayment = (paymentId: PaymentId) => {
  refundsByPayment ??= groupBy(store.refunds, (row) => row.paymentId)
  return refundsByPayment.get(paymentId) ?? []
}
const adjustmentsOf = (invoiceId: InvoiceId) => {
  adjustmentsByInvoice ??= groupBy(store.adjustments, (row) => row.invoiceId)
  return adjustmentsByInvoice.get(invoiceId) ?? []
}
const discountsOf = (invoiceId: InvoiceId) => {
  discountsByInvoice ??= groupBy(store.discounts, (row) => row.invoiceId)
  return discountsByInvoice.get(invoiceId) ?? []
}
const scholarshipsOf = (studentId: string) => {
  scholarshipsByStudent ??= groupBy(store.scholarships, (row) => row.studentId)
  return scholarshipsByStudent.get(studentId) ?? []
}
const timelineOf = (studentId: string) => {
  timelineByStudent ??= groupBy(store.timeline, (row) => row.studentId)
  return timelineByStudent.get(studentId) ?? []
}

/** Rebuilds the deterministic store; used by tests between cases. */
export function resetFinanceStore(): void {
  store = createFinanceStore()
  scaleLoaded = false
  idCounter = 0
  invalidateIndexes()
  financeScenarios.reset()
}

function ensureScale(): void {
  const scenario = financeScenarios.read()
  if (!scenario.scale || scaleLoaded) return
  const generated = buildScaleInvoices(scenario.scaleSize)
  store.invoices.push(...generated.invoices)
  store.payments.push(...generated.payments)
  scaleLoaded = true
  invalidateIndexes()
}

// ── Guards ──────────────────────────────────────────────────────────────────

/** Every operation checks its exact permission key (spec FR-040, FR-041). */
function require(context: FinanceServiceContext, permission: string): void {
  if (!hasFinancePermission(context, permission))
    throw new FinanceError("forbidden")
}

function findInvoice(
  invoiceId: InvoiceId,
  context: FinanceServiceContext
): Invoice {
  const invoice = invoiceOf(invoiceId)
  if (!invoice) throw new FinanceError("not-found")
  if (invoice.organizationId !== context.organizationId)
    throw new FinanceError("not-found")
  if (!isInScope(invoice, context)) throw new FinanceError("out-of-scope")
  return invoice
}

function assertVersion(invoice: Invoice, expectedVersion: number): void {
  if (financeScenarios.read().forceConflict)
    throw new FinanceError("version-conflict", { currentVersion: invoice.version })
  if (invoice.version !== expectedVersion)
    throw new FinanceError("version-conflict", { currentVersion: invoice.version })
}

function touch(invoice: Invoice, context: FinanceServiceContext): void {
  invoice.version += 1
  invoice.updatedAt = context.now()
  invoice.updatedBy = { id: context.userId, name: context.userName, active: true }
}

/** Appends exactly one event. Callers are inside a command that has succeeded. */
function appendEvent(input: {
  studentId: string
  invoiceId?: InvoiceId
  category: FinanceEventCategory
  summary: string
  amount?: Money
  context: FinanceServiceContext
  subjectRef?: string
}): void {
  store.timeline.push({
    id: nextId("finance-event") as FinanceEventId,
    studentId: input.studentId,
    invoiceId: input.invoiceId,
    category: input.category,
    occurredAt: input.context.now(),
    sequence: nextSequence(timelineOf(input.studentId)),
    actor: {
      id: input.context.userId,
      name: input.context.userName,
      active: true,
    },
    subjectRef: input.subjectRef,
    amount: input.amount,
    summary: input.summary,
  })
  timelineByStudent = null
}

async function guard(
  area: "invoices" | "payments" | "installments" | "refunds" | "profile" | "timeline"
): Promise<void> {
  await scenarioDelay()
  if (shouldFail(area)) throw new FinanceError("service-unavailable")
}

// ── Derivation helpers ──────────────────────────────────────────────────────

function balanceOf(invoice: Invoice): InvoiceBalance {
  return invoiceBalance({
    invoice,
    adjustments: adjustmentsOf(invoice.id),
    payments: paymentsOf(invoice.id),
    refunds: refundsOf(invoice.id),
  })
}

function installmentViews(invoice: Invoice): InstallmentView[] {
  const payments = paymentsOf(invoice.id)
  const now = scenarioNow()
  return installmentsOf(invoice.id)
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .map((installment) => ({
      ...installment,
      paidAmount: installmentPaid(installment.id, payments, CURRENCY, PRECISION),
      remaining: installmentRemaining(installment, payments),
      status: deriveInstallmentStatus(installment, payments, now),
    }))
}

function areaPermissions(context: FinanceServiceContext): FinanceAreaPermissions {
  const can = (permission: string) => hasFinancePermission(context, permission)
  return {
    view: can(financePermissions.view),
    invoicesView: can(financePermissions.invoicesView),
    invoicesCreate: can(financePermissions.invoicesCreate),
    invoicesUpdate: can(financePermissions.invoicesUpdate),
    invoicesIssue: can(financePermissions.invoicesIssue),
    invoicesCancel: can(financePermissions.invoicesCancel),
    installmentsManage: can(financePermissions.installmentsManage),
    paymentsView: can(financePermissions.paymentsView),
    paymentsRecord: can(financePermissions.paymentsRecord),
    discountsApprove: can(financePermissions.discountsApprove),
    scholarshipsApprove: can(financePermissions.scholarshipsApprove),
    refundsView: can(financePermissions.refundsView),
    refundsRecord: can(financePermissions.refundsRecord),
    refundsApprove: can(financePermissions.refundsApprove),
    timelineView: can(financePermissions.timelineView),
    export: can(financePermissions.export),
  }
}

const branchLabel = (branchId: string) =>
  financeBranches.find((entry) => entry.value === branchId)?.label ?? branchId

function toInvoiceSummary(invoice: Invoice): InvoiceSummary {
  const balance = balanceOf(invoice)
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    studentId: invoice.studentId,
    studentCode: invoice.studentCode,
    studentName: invoice.studentName,
    offeringLabel: invoice.offeringLabel,
    batchLabel: invoice.batchLabel,
    branchId: invoice.branchId,
    branchLabel: branchLabel(invoice.branchId),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    finalAmount: balance.finalAmount,
    paidAmount: balance.netPaid,
    remaining: balance.remaining,
    status: deriveInvoiceStatus(invoice, balance),
    updatedAt: invoice.updatedAt,
    version: invoice.version,
  }
}

function toInvoiceDetail(
  invoice: Invoice,
  context: FinanceServiceContext
): InvoiceDetail {
  const balance = balanceOf(invoice)
  const permissions = areaPermissions(context)
  return {
    ...clone(invoice),
    plan: clone(store.plans.find((plan) => plan.invoiceId === invoice.id)),
    installments: clone(installmentViews(invoice)),
    payments: permissions.paymentsView ? clone(paymentsOf(invoice.id)) : [],
    discounts: clone(discountsOf(invoice.id)),
    scholarships: clone(scholarshipsOf(invoice.studentId)),
    adjustments: clone(adjustmentsOf(invoice.id)),
    refunds: permissions.refundsView ? clone(refundsOf(invoice.id)) : [],
    derived: {
      finalAmount: balance.finalAmount,
      netPaid: balance.netPaid,
      remaining: balance.remaining,
      status: deriveInvoiceStatus(invoice, balance),
    },
    permissions,
  }
}

function scopedInvoices(context: FinanceServiceContext): Invoice[] {
  ensureScale()
  return store.invoices.filter((invoice) => isInScope(invoice, context))
}

function matchesInvoiceSearch(invoice: Invoice, term: string): boolean {
  return [
    invoice.invoiceNumber.toLowerCase(),
    invoice.studentCode.toLowerCase(),
    normalizeSearchTerm(invoice.studentName),
  ].some((value) => value.includes(term))
}

/**
 * The invoice filter, shared by the queue and the dashboard.
 *
 * One implementation, so a total can never be computed over a different set than
 * the list it claims to summarize.
 */
function filterInvoices(
  context: FinanceServiceContext,
  normalized: {
    search?: string
    branchIds?: string[]
    studentIds?: string[]
    offeringIds?: string[]
    statuses?: InvoiceStatus[]
    dateRange?: { field: string; from?: string; to?: string }
  }
): Invoice[] {
  return scopedInvoices(context).filter((invoice) => {
    if (normalized.search && !matchesInvoiceSearch(invoice, normalized.search))
      return false
    if (normalized.branchIds && !normalized.branchIds.includes(invoice.branchId))
      return false
    if (normalized.studentIds && !normalized.studentIds.includes(invoice.studentId))
      return false
    if (normalized.offeringIds && !normalized.offeringIds.includes(invoice.offeringId))
      return false
    if (normalized.statuses) {
      const status = deriveInvoiceStatus(invoice, balanceOf(invoice))
      if (!normalized.statuses.includes(status)) return false
    }
    if (normalized.dateRange) {
      const value =
        normalized.dateRange.field === "issueDate"
          ? invoice.issueDate
          : invoice.dueDate
      if (!value || !isWithinRange(value, normalized.dateRange)) return false
    }
    return true
  })
}

// ── Service ─────────────────────────────────────────────────────────────────

export const studentFinanceService: StudentFinanceService = {
  async listInvoices(query) {
    await guard("invoices")
    const context = scenarioContext()
    require(context, financePermissions.invoicesView)
    const normalized = normalizeInvoiceListQuery(query)
    if (isInvertedRange(normalized.dateRange))
      throw new FinanceError("invalid-date-range")

    const filtered = filterInvoices(context, normalized)

    const direction = normalized.sort?.direction === "asc" ? 1 : -1
    const field = normalized.sort?.field
    // Sort keys are computed once per row rather than inside the comparator.
    // Deriving a balance per comparison meant ~2·n·log n balance derivations —
    // 2.3s to sort 50,000 invoices by amount, against a 2s budget (SC-010).
    const decorated = filtered.map((invoice) => ({
      invoice,
      key:
        field === "invoiceNumber"
          ? invoice.invoiceNumber
          : field === "dueDate"
            ? invoice.dueDate
            : field === "finalAmount"
              ? toMinor(balanceOf(invoice).finalAmount)
              : field === "remaining"
                ? toMinor(balanceOf(invoice).remaining)
                : invoice.updatedAt,
    }))
    decorated.sort((left, right) => {
      if (typeof left.key === "number" && typeof right.key === "number")
        return (left.key - right.key) * direction
      return String(left.key).localeCompare(String(right.key)) * direction
    })
    const sorted = decorated.map((entry) => entry.invoice)

    const page = clampPage(normalized.page, normalized.pageSize, sorted.length)
    const start = (page - 1) * normalized.pageSize
    return {
      items: clone(
        sorted.slice(start, start + normalized.pageSize).map(toInvoiceSummary)
      ),
      total: sorted.length,
      page,
      pageSize: normalized.pageSize,
      totalPages: Math.max(1, Math.ceil(sorted.length / normalized.pageSize)),
    } satisfies Paginated<InvoiceSummary>
  },

  async getInvoice(invoiceId) {
    await guard("invoices")
    const context = scenarioContext()
    require(context, financePermissions.invoicesView)
    return toInvoiceDetail(findInvoice(invoiceId, context), context)
  },

  async listInvoicePayments(invoiceId) {
    await guard("payments")
    const context = scenarioContext()
    require(context, financePermissions.paymentsView)
    findInvoice(invoiceId, context)
    return clone(paymentsOf(invoiceId))
  },

  async listPayments(query) {
    await guard("payments")
    const context = scenarioContext()
    require(context, financePermissions.paymentsView)
    const normalized = normalizePaymentListQuery(query)
    if (isInvertedRange(normalized.dateRange))
      throw new FinanceError("invalid-date-range")

    ensureScale()
    const rows = store.payments.filter((payment) => {
      const invoice = invoiceOf(payment.invoiceId)
      if (!invoice || !isInScope(invoice, context)) return false
      if (
        normalized.search &&
        ![
          payment.receiptNumber.toLowerCase(),
          invoice.invoiceNumber.toLowerCase(),
          invoice.studentCode.toLowerCase(),
          normalizeSearchTerm(invoice.studentName),
        ].some((value) => value.includes(normalized.search!))
      )
        return false
      if (normalized.branchIds && !normalized.branchIds.includes(payment.branchId))
        return false
      if (normalized.studentIds && !normalized.studentIds.includes(payment.studentId))
        return false
      if (normalized.methodIds && !normalized.methodIds.includes(payment.methodId))
        return false
      if (!isWithinRange(payment.paymentDate, normalized.dateRange)) return false
      return true
    })

    const direction = normalized.sort?.direction === "asc" ? 1 : -1
    const sorted = [...rows].sort(
      (left, right) => left.paymentDate.localeCompare(right.paymentDate) * direction
    )
    const page = clampPage(normalized.page, normalized.pageSize, sorted.length)
    const start = (page - 1) * normalized.pageSize

    return {
      items: clone(
        sorted.slice(start, start + normalized.pageSize).map((payment) => {
          const invoice = invoiceOf(payment.invoiceId)!
          return {
            id: payment.id,
            receiptNumber: payment.receiptNumber,
            studentId: payment.studentId,
            studentCode: invoice.studentCode,
            studentName: invoice.studentName,
            invoiceId: payment.invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            branchLabel: branchLabel(payment.branchId),
            methodId: payment.methodId,
            methodLabel: payment.methodLabel,
            paymentDate: payment.paymentDate,
            amount: payment.amount,
            recordedByName: payment.recordedBy.name,
          } satisfies PaymentSummary
        })
      ),
      total: sorted.length,
      page,
      pageSize: normalized.pageSize,
      totalPages: Math.max(1, Math.ceil(sorted.length / normalized.pageSize)),
    }
  },

  async listInstallments(query) {
    await guard("installments")
    const context = scenarioContext()
    require(context, financePermissions.invoicesView)
    const normalized = normalizeInstallmentListQuery(query)
    if (isInvertedRange(normalized.dateRange))
      throw new FinanceError("invalid-date-range")

    ensureScale()
    const rows: InstallmentSummary[] = []
    for (const invoice of store.invoices) {
      if (!isInScope(invoice, context)) continue
      if (normalized.branchIds && !normalized.branchIds.includes(invoice.branchId))
        continue
      for (const view of installmentViews(invoice)) {
        if (normalized.statuses && !normalized.statuses.includes(view.status))
          continue
        if (!isWithinRange(view.dueDate, normalized.dateRange)) continue
        if (
          normalized.search &&
          ![
            invoice.invoiceNumber.toLowerCase(),
            invoice.studentCode.toLowerCase(),
            normalizeSearchTerm(invoice.studentName),
          ].some((value) => value.includes(normalized.search!))
        )
          continue
        rows.push({
          id: view.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          studentCode: invoice.studentCode,
          studentName: invoice.studentName,
          branchLabel: branchLabel(invoice.branchId),
          sequence: view.sequence,
          dueDate: view.dueDate,
          amount: view.amount,
          paidAmount: view.paidAmount,
          remaining: view.remaining,
          status: view.status,
        })
      }
    }

    const direction = normalized.sort?.direction === "asc" ? 1 : -1
    const sorted = [...rows].sort(
      (left, right) => left.dueDate.localeCompare(right.dueDate) * direction
    )
    const page = clampPage(normalized.page, normalized.pageSize, sorted.length)
    const start = (page - 1) * normalized.pageSize
    return {
      items: clone(sorted.slice(start, start + normalized.pageSize)),
      total: sorted.length,
      page,
      pageSize: normalized.pageSize,
      totalPages: Math.max(1, Math.ceil(sorted.length / normalized.pageSize)),
    }
  },

  async listRefunds(query) {
    await guard("refunds")
    const context = scenarioContext()
    require(context, financePermissions.refundsView)
    const normalized = normalizeRefundListQuery(query)
    if (isInvertedRange(normalized.dateRange))
      throw new FinanceError("invalid-date-range")

    const rows = store.refunds.filter((refund) => {
      const invoice = invoiceOf(refund.invoiceId)
      if (!invoice || !isInScope(invoice, context)) return false
      if (normalized.statuses && !normalized.statuses.includes(refund.status))
        return false
      if (!isWithinRange(refund.refundDate, normalized.dateRange)) return false
      if (
        normalized.search &&
        ![invoice.invoiceNumber.toLowerCase(), invoice.studentCode.toLowerCase()].some(
          (value) => value.includes(normalized.search!)
        )
      )
        return false
      return true
    })

    const page = clampPage(normalized.page, normalized.pageSize, rows.length)
    const start = (page - 1) * normalized.pageSize
    return {
      items: clone(
        rows.slice(start, start + normalized.pageSize).map((refund) => {
          const invoice = invoiceOf(refund.invoiceId)!
          const payment = store.payments.find((item) => item.id === refund.paymentId)
          return {
            id: refund.id,
            paymentId: refund.paymentId,
            receiptNumber: payment?.receiptNumber ?? "—",
            invoiceId: refund.invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            studentId: invoice.studentId,
            studentCode: invoice.studentCode,
            studentName: invoice.studentName,
            branchLabel: branchLabel(invoice.branchId),
            amount: refund.amount,
            refundDate: refund.refundDate,
            status: refund.status,
            requestedByName: refund.requestedBy.name,
            approvedByName: refund.approvedBy?.name,
            // The invoice version, because that is the aggregate a refund
            // decision is guarded by — the queue can act without a second read.
            version: invoice.version,
          } satisfies RefundSummary
        })
      ),
      total: rows.length,
      page,
      pageSize: normalized.pageSize,
      totalPages: Math.max(1, Math.ceil(rows.length / normalized.pageSize)),
    }
  },

  async getDashboardSummary(query) {
    await guard("invoices")
    const context = scenarioContext()
    require(context, financePermissions.view)
    if (isInvertedRange(query.dateRange))
      throw new FinanceError("invalid-date-range")

    const normalized = normalizeInvoiceListQuery({
      ...query,
      page: 1,
      pageSize: 1,
    })
    // Every matching invoice, not a page of them.
    const matching = filterInvoices(context, normalized)

    let invoiced = zero()
    let collected = zero()
    let outstanding = zero()
    let unsettledInvoices = 0

    for (const invoice of matching) {
      // Cancelled invoices stop contributing to balances but stay readable.
      if (!contributesToBalance(invoice)) continue
      const balance = balanceOf(invoice)
      invoiced = add(invoiced, balance.finalAmount)
      collected = add(collected, balance.netPaid)
      outstanding = add(outstanding, balance.remaining)
      const status = deriveInvoiceStatus(invoice, balance)
      if (status === "issued" || status === "partially-paid")
        unsettledInvoices += 1
    }

    return {
      invoiced,
      collected,
      outstanding,
      unsettledInvoices,
      // A fact, not an inference from zero totals.
      hasNoRecords: matching.length === 0,
      asOf: scenarioNow(),
    }
  },
  async getStudentFinancialProfile(studentId) {
    await guard("profile")
    const context = scenarioContext()
    require(context, financePermissions.view)

    const invoices = invoicesOf(studentId).filter((invoice) =>
      isInScope(invoice, context)
    )
    const now = scenarioNow()

    const totals = studentTotals({
      invoices,
      adjustmentsByInvoice: adjustmentsOf,
      paymentsByInvoice: paymentsOf,
      refundsByInvoice: refundsOf,
      currency: CURRENCY,
      precision: PRECISION,
    })

    const active = invoices.filter((invoice) => invoice.status !== "cancelled")
    const installmentStatuses = active.flatMap((invoice) =>
      installmentViews(invoice).map((view) => view.status)
    )

    const perEnrollment = new Map<string, Invoice[]>()
    for (const invoice of active) {
      const bucket = perEnrollment.get(invoice.enrollmentId)
      if (bucket) bucket.push(invoice)
      else perEnrollment.set(invoice.enrollmentId, [invoice])
    }

    const profile: StudentFinancialProfile = {
      studentId,
      studentCode: invoices[0]?.studentCode ?? "—",
      studentName: invoices[0]?.studentName ?? "—",
      currency: CURRENCY,
      precision: PRECISION,
      totals,
      outstandingInstallments: outstandingInstallmentCount(installmentStatuses),
      scholarships: scholarshipsOf(studentId).map((scholarship) => ({
        id: scholarship.id,
        name: scholarship.name,
        value: scholarship.value,
        kind: scholarship.kind,
        coverage: scholarship.coverage,
        approvedByName: scholarship.approvedBy.name,
        approvedAt: scholarship.approvedAt,
      })),
      discounts: active.flatMap((invoice) =>
        discountsOf(invoice.id).map((discount) => ({
          id: discount.id,
          invoiceNumber: invoice.invoiceNumber,
          value: discount.value,
          kind: discount.kind,
          reason: discount.reason,
          approvedByName: discount.approvedBy.name,
          approvedAt: discount.approvedAt,
        }))
      ),
      financialStatus: deriveFinancialStatus({
        invoices: active.map((invoice) => ({ invoice, balance: balanceOf(invoice) })),
        installmentStatuses,
        remainingBalance: totals.remainingBalance,
        now,
      }),
      perEnrollment: [...perEnrollment.entries()].map(([enrollmentId, rows]) => {
        const enrollmentTotals = studentTotals({
          invoices: rows,
          adjustmentsByInvoice: adjustmentsOf,
          paymentsByInvoice: paymentsOf,
          refundsByInvoice: refundsOf,
          currency: CURRENCY,
          precision: PRECISION,
        })
        return {
          enrollmentId,
          offeringLabel: rows[0]!.offeringLabel,
          offeringKind: rows[0]!.offeringKind,
          batchLabel: rows[0]!.batchLabel,
          totalFees: enrollmentTotals.totalFees,
          paidAmount: enrollmentTotals.paidAmount,
          remaining: enrollmentTotals.remainingBalance,
          status: deriveFinancialStatus({
            invoices: rows.map((invoice) => ({ invoice, balance: balanceOf(invoice) })),
            installmentStatuses: rows.flatMap((invoice) =>
              installmentViews(invoice).map((view) => view.status)
            ),
            remainingBalance: enrollmentTotals.remainingBalance,
            now,
          }),
        }
      }),
      // A student with no invoices yields zeroes that are a fact, not an absence.
      hasNoRecords: invoices.length === 0,
      asOf: now,
    }

    return clone(profile)
  },

  async listTimeline(studentId, query: FinanceTimelineQuery) {
    await guard("timeline")
    const context = scenarioContext()
    require(context, financePermissions.timelineView)
    return clone(pageTimeline(timelineOf(studentId), query))
  },

  async lookups(): Promise<FinanceLookups> {
    await scenarioDelay()
    const configuration = await financeDependencyReaders.organization.getFinanceConfiguration()
    return clone({
      paymentMethods: configuration.paymentMethods,
      chargePurposes: [
        { value: "tuition", label: "رسوم دراسية", active: true },
        { value: "registration-fee", label: "رسوم تسجيل", active: true },
      ],
      branches: configuration.branches,
      offerings: offeringOptions(),
      batches: batchOptions(),
      invoiceStatuses: [
        { value: "draft" as const, label: "مسودة" },
        { value: "issued" as const, label: "صادرة" },
        { value: "partially-paid" as const, label: "مدفوعة جزئيًا" },
        { value: "paid" as const, label: "مدفوعة بالكامل" },
        { value: "cancelled" as const, label: "ملغاة" },
      ],
      refundStatuses: [
        { value: "requested" as const, label: "قيد الطلب" },
        { value: "approved" as const, label: "معتمد" },
        { value: "completed" as const, label: "مكتمل" },
        { value: "rejected" as const, label: "مرفوض" },
        { value: "cancelled" as const, label: "ملغى" },
      ],
      installmentEligibility: configuration.installmentEligibility,
      discountPolicy: configuration.discountPolicy,
      scholarshipPolicy: configuration.scholarshipPolicy,
      numbering: configuration.numbering,
      duePolicy: configuration.duePolicy,
      currency: configuration.currency,
      precision: configuration.precision,
    })
  },

  async getAccountingContext(query) {
    await guard("invoices")
    const context = scenarioContext()
    require(context, financePermissions.view)
    const page = await this.listInvoices({ ...query, page: 1, pageSize: 1000 })
    const invoiceIds = new Set(page.items.map((item) => item.id))

    return clone({
      invoices: page.items.map((item) => ({
        id: item.id,
        invoiceNumber: item.invoiceNumber,
        studentId: item.studentId,
        enrollmentId:
          invoiceOf(item.id)?.enrollmentId ?? "",
        issueDate: item.issueDate,
        finalAmount: item.finalAmount,
        status: item.status,
      })),
      payments: store.payments
        .filter((payment) => invoiceIds.has(payment.invoiceId))
        .map((payment) => ({
          id: payment.id,
          receiptNumber: payment.receiptNumber,
          invoiceId: payment.invoiceId,
          methodId: payment.methodId,
          paymentDate: payment.paymentDate,
          amount: payment.amount,
        })),
      refunds: store.refunds
        .filter((refund) => invoiceIds.has(refund.invoiceId))
        .map((refund) => ({
          id: refund.id,
          paymentId: refund.paymentId,
          amount: refund.amount,
          refundDate: refund.refundDate,
          status: refund.status,
        })),
      asOf: scenarioNow(),
      currency: CURRENCY,
      precision: PRECISION,
    }) satisfies AccountingContext
  },

  async exportInvoices(query) {
    const context = scenarioContext()
    require(context, financePermissions.export)
    const page = await this.listInvoices({ ...query, page: 1, pageSize: 1000 })
    const header = [
      "invoice_number",
      "student_code",
      "student_name",
      "offering",
      "issue_date",
      "due_date",
      "final_amount",
      "paid",
      "remaining",
      "status",
    ].join(",")
    const rows = page.items.map((item) =>
      [
        item.invoiceNumber,
        item.studentCode,
        `"${item.studentName}"`,
        `"${item.offeringLabel}"`,
        item.issueDate ?? "",
        item.dueDate,
        item.finalAmount.amount,
        item.paidAmount.amount,
        item.remaining.amount,
        item.status,
      ].join(",")
    )
    return [header, ...rows].join("\n")
  },

  // ── Commands ──────────────────────────────────────────────────────────────

  async raiseInvoices(command: RaiseInvoicesCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, financePermissions.invoicesCreate)

    const purposes = command.purposes?.length ? command.purposes : ["tuition"]
    const results: InvoiceSummary[] = []

    for (const purpose of purposes) {
      const key = intakeIdempotencyKey(command.enrollmentId, purpose)
      const existingId = store.intakeIndex.get(key)
      if (existingId) {
        const existing = invoiceOf(existingId)
        if (existing) {
          results.push(toInvoiceSummary(existing))
          continue
        }
      }

      const enrollment = await financeDependencyReaders.students.getEnrollment(
        command.enrollmentId
      )
      if (!enrollment) throw new FinanceError("not-found")
      const terms = await financeDependencyReaders.admissions.getAgreedTerms(
        command.enrollmentId
      )
      if (!terms) throw new FinanceError("not-found")
      const student = await financeDependencyReaders.students.getStudent(
        enrollment.studentId
      )
      if (!student) throw new FinanceError("not-found")

      const figures = computeFigures(terms.productPrice)
      const invoiceNumber = formatInvoiceNumber(
        financeConfiguration().numbering,
        (store.invoiceSequence += 1)
      )
      if (store.invoices.some((item) => item.invoiceNumber === invoiceNumber))
        throw new FinanceError("duplicate-number")

      const now = context.now()
      const invoiceId = `invoice-${invoiceNumber}` as InvoiceId
      const invoice: Invoice = {
        id: invoiceId,
        organizationId: context.organizationId,
        invoiceNumber,
        studentId: enrollment.studentId,
        studentCode: student.code,
        studentName: student.name,
        enrollmentId: enrollment.id,
        branchId: enrollment.branchId,
        offeringId: enrollment.offeringId,
        offeringLabel: enrollment.offeringLabel,
        offeringKind: enrollment.offeringKind,
        batchId: enrollment.batchId,
        batchLabel: enrollment.batchLabel,
        purpose,
        dueDate: now,
        currency: CURRENCY,
        precision: PRECISION,
        draft: figures,
        status: "draft",
        statusHistory: [
          {
            fromStatus: null,
            toStatus: "draft",
            actor: { id: context.userId, name: context.userName, active: true },
            occurredAt: now,
          },
        ],
        createdAt: now,
        createdBy: { id: context.userId, name: context.userName, active: true },
        updatedAt: now,
        updatedBy: { id: context.userId, name: context.userName, active: true },
        version: 1,
      }

      store.invoices.push(invoice)
      store.intakeIndex.set(key, invoiceId)
      invalidateIndexes()
      appendEvent({
        studentId: invoice.studentId,
        invoiceId,
        category: "invoice-created",
        summary: `تم إنشاء الفاتورة ${invoiceNumber}`,
        amount: figures.finalAmount,
        context,
      })
      results.push(toInvoiceSummary(invoice))
    }

    return clone(results)
  },

  async updateDraftInvoice(command: UpdateDraftInvoiceCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, financePermissions.invoicesUpdate)
    const invoice = findInvoice(command.invoiceId, context)
    // Issued figures are frozen; later reductions become adjustments (FR-007).
    if (!isEditable(invoice.status)) throw new FinanceError("invoice-immutable")
    assertVersion(invoice, command.expectedVersion)

    const figures = computeFigures(
      money(command.input.totalAmount),
      command.input.scholarship,
      command.input.discount
    )
    invoice.draft = figures
    invoice.dueDate = command.input.dueDate
    touch(invoice, context)
    invalidateIndexes()
    return toInvoiceDetail(invoice, context)
  },

  async issueInvoice(command: IssueInvoiceCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    const invoice = findInvoice(command.invoiceId, context)
    const evaluation = evaluateInvoiceTransition({
      from: invoice.status,
      to: "issued",
      permissions: context.permissions,
      hasPayments: paymentsOf(invoice.id).length > 0,
    })
    if (!evaluation.ok) throw new FinanceError(evaluation.code)
    assertVersion(invoice, command.expectedVersion)

    // The freeze: written once, never again.
    invoice.issuedSnapshot = { ...invoice.draft }
    invoice.issueDate = context.now()
    invoice.status = "issued"
    invoice.statusHistory.push({
      fromStatus: "draft",
      toStatus: "issued",
      actor: { id: context.userId, name: context.userName, active: true },
      occurredAt: invoice.issueDate,
    })
    touch(invoice, context)
    invalidateIndexes()
    appendEvent({
      studentId: invoice.studentId,
      invoiceId: invoice.id,
      category: "invoice-issued",
      summary: `تم إصدار الفاتورة ${invoice.invoiceNumber}`,
      amount: invoice.issuedSnapshot.finalAmount,
      context,
    })
    return toInvoiceDetail(invoice, context)
  },

  async cancelInvoice(command: CancelInvoiceCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    const invoice = findInvoice(command.invoiceId, context)
    const evaluation = evaluateInvoiceTransition({
      from: invoice.status,
      to: "cancelled",
      reason: command.reason,
      permissions: context.permissions,
      hasPayments: paymentsOf(invoice.id).length > 0,
    })
    if (!evaluation.ok) throw new FinanceError(evaluation.code)
    assertVersion(invoice, command.expectedVersion)

    invoice.status = "cancelled"
    invoice.cancelledAt = context.now()
    invoice.cancelReason = command.reason
    invoice.statusHistory.push({
      fromStatus: invoice.statusHistory.at(-1)?.toStatus ?? "issued",
      toStatus: "cancelled",
      reason: command.reason,
      actor: { id: context.userId, name: context.userName, active: true },
      occurredAt: invoice.cancelledAt,
    })
    touch(invoice, context)
    invalidateIndexes()
    appendEvent({
      studentId: invoice.studentId,
      invoiceId: invoice.id,
      category: "invoice-cancelled",
      summary: `تم إلغاء الفاتورة ${invoice.invoiceNumber}`,
      context,
    })
    return toInvoiceDetail(invoice, context)
  },

  async getInstallmentPolicy() {
    return { available: true, minCount: 1, maxCount: 12, frequency: "monthly" as const }
  },

  async generateInstallmentPlan(command: GenerateInstallmentPlanCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, financePermissions.installmentsManage)
    const invoice = findInvoice(command.invoiceId, context)
    assertVersion(invoice, command.expectedVersion)

    const existing = installmentsOf(invoice.id)
    const payments = paymentsOf(invoice.id)
    const hasPaidInstallments = existing.some((installment) =>
      payments.some((payment) => payment.installmentId === installment.id)
    )

    const validation = validatePlanRequest({
      offeringKind: invoice.offeringKind,
      count: command.count,
      policy: financeConfiguration().installmentEligibility,
      hasPaidInstallments,
    })
    if (!validation.ok)
      throw new FinanceError(
        validation.code === "validation-failed"
          ? "validation-failed"
          : validation.code
      )

    // Replace the plan and its installments wholesale; nothing was collected.
    store.plans = store.plans.filter((plan) => plan.invoiceId !== invoice.id)
    store.installments = store.installments.filter(
      (installment) => installment.invoiceId !== invoice.id
    )

    const planId = nextId("plan") as InstallmentPlanId
    store.plans.push({
      id: planId,
      invoiceId: invoice.id,
      count: command.count,
      scheduleBasis: command.scheduleBasis,
      firstDueDate: command.firstDueDate,
      generatedAt: context.now(),
      generatedBy: { id: context.userId, name: context.userName, active: true },
    })

    const balance = balanceOf(invoice)
    for (const entry of buildSchedule({
      finalAmount: balance.finalAmount,
      count: command.count,
      scheduleBasis: command.scheduleBasis,
      firstDueDate: command.firstDueDate,
      customDueDates: command.customDueDates,
    }))
      store.installments.push({
        id: nextId("installment") as InstallmentId,
        planId,
        invoiceId: invoice.id,
        sequence: entry.sequence,
        dueDate: entry.dueDate,
        amount: entry.amount,
      })

    touch(invoice, context)
    invalidateIndexes()
    appendEvent({
      studentId: invoice.studentId,
      invoiceId: invoice.id,
      category: "installment-plan-generated",
      summary: `تم إنشاء خطة تقسيط من ${command.count} أقساط`,
      context,
    })
    return toInvoiceDetail(invoice, context)
  },

  async recordPayment(command: RecordPaymentCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, financePermissions.paymentsRecord)
    const invoice = findInvoice(command.invoiceId, context)
    assertVersion(invoice, command.expectedVersion)

    const status = deriveInvoiceStatus(invoice, balanceOf(invoice))
    if (!isPayable(status)) throw new FinanceError("invoice-not-payable")

    const method = financeConfiguration().paymentMethods.find(
      (entry) => entry.id === command.methodId
    )
    if (!method) throw new FinanceError("validation-failed")
    if (!method.active) throw new FinanceError("payment-method-inactive")

    const amount = money(command.amount)
    if (compare(amount, zero()) <= 0) throw new FinanceError("negative-amount")

    // The balance is re-read **inside** the operation, not taken from the
    // client's view, so two concurrent payments cannot overdraw (research R8).
    const balance = balanceOf(invoice)
    if (compare(amount, balance.remaining) > 0)
      throw new FinanceError("payment-exceeds-balance", {
        remaining: balance.remaining.amount,
      })

    if (command.installmentId) {
      const installment = installmentsOf(invoice.id).find(
        (item) => item.id === command.installmentId
      )
      if (!installment) throw new FinanceError("not-found")
      const remaining = installmentRemaining(installment, paymentsOf(invoice.id))
      if (compare(amount, remaining) > 0)
        throw new FinanceError("installment-exceeds-remaining", {
          remaining: remaining.amount,
        })
    }

    const receiptNumber = formatReceiptNumber(
      financeConfiguration().numbering,
      (store.receiptSequence += 1)
    )
    if (store.payments.some((item) => item.receiptNumber === receiptNumber))
      throw new FinanceError("duplicate-number")

    const payment: Payment = {
      id: nextId("payment") as PaymentId,
      organizationId: context.organizationId,
      receiptNumber,
      studentId: invoice.studentId,
      invoiceId: invoice.id,
      installmentId: command.installmentId,
      branchId: invoice.branchId,
      methodId: method.id,
      methodLabel: method.label,
      paymentDate: command.paymentDate,
      amount,
      notes: command.notes,
      recordedAt: context.now(),
      recordedBy: { id: context.userId, name: context.userName, active: true },
    }
    store.payments.push(payment)
    touch(invoice, context)
    invalidateIndexes()
    appendEvent({
      studentId: invoice.studentId,
      invoiceId: invoice.id,
      category: "payment-received",
      summary: `تم استلام دفعة بإيصال ${receiptNumber}`,
      amount,
      context,
      subjectRef: payment.id,
    })

    return clone({
      id: payment.id,
      receiptNumber,
      studentId: payment.studentId,
      studentCode: invoice.studentCode,
      studentName: invoice.studentName,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      branchLabel: branchLabel(invoice.branchId),
      methodId: method.id,
      methodLabel: method.label,
      paymentDate: payment.paymentDate,
      amount,
      recordedByName: payment.recordedBy.name,
    } satisfies PaymentSummary)
  },

  async applyDiscount(command: ApplyDiscountCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, financePermissions.discountsApprove)
    const invoice = findInvoice(command.invoiceId, context)
    assertVersion(invoice, command.expectedVersion)

    const balance = balanceOf(invoice)
    const editable = isEditable(invoice.status)
    // Pre-issuance the discount replaces the one on the draft, so it resolves
    // against the tuition base after any scholarship; post-issuance it resolves
    // against the current balance. `discountBase` keeps validation and
    // application on the same base — and matches the editor's live preview.
    const scholarshipOnDraft = isZero(invoice.draft.scholarshipTotal)
      ? undefined
      : ({
          kind: "amount",
          value: invoice.draft.scholarshipTotal.amount,
        } as const)
    const discountBase = editable
      ? subtract(invoice.draft.totalAmount, invoice.draft.scholarshipTotal)
      : balance.finalAmount
    const validation = validateReduction({
      base: discountBase,
      reduction: { kind: command.kind, value: command.value },
      policy: financeConfiguration().discountPolicy,
      collected: balance.netPaid,
      currentFinal: balance.finalAmount,
    })
    if (!validation.ok)
      throw new FinanceError(validation.code, {
        limit: validation.limit,
        collected: validation.collected,
      })

    const approvedBy = { id: context.userId, name: context.userName, active: true }
    const discount: Discount = {
      id: nextId("discount") as DiscountId,
      invoiceId: invoice.id,
      kind: command.kind,
      value: command.value,
      reason: command.reason,
      approvedBy,
      approvedAt: context.now(),
    }
    store.discounts.push(discount)

    if (editable) {
      // Pre-issuance: the invoice's own figures change. Any scholarship already
      // on the draft is carried through — a discount must not silently undo it.
      invoice.draft = computeFigures(
        invoice.draft.totalAmount,
        scholarshipOnDraft,
        { kind: command.kind, value: command.value }
      )
    } else {
      // Post-issuance: an adjustment, leaving the snapshot untouched (FR-023).
      store.adjustments.push({
        id: nextId("adjustment") as AdjustmentId,
        invoiceId: invoice.id,
        sourceKind: "discount",
        sourceId: discount.id,
        amount: validation.amount,
        reason: command.reason,
        approvedBy,
        createdAt: context.now(),
      })
    }

    touch(invoice, context)
    invalidateIndexes()
    appendEvent({
      studentId: invoice.studentId,
      invoiceId: invoice.id,
      category: isEditable(invoice.status) ? "discount-applied" : "adjustment-recorded",
      summary: command.reason,
      amount: validation.amount,
      context,
      subjectRef: discount.id,
    })
    return toInvoiceDetail(invoice, context)
  },

  async awardScholarship(command: AwardScholarshipCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, financePermissions.scholarshipsApprove)

    // Full coverage is the whole tuition regardless of the entered figure; partial
    // coverage is whatever was awarded (spec FR-021).
    const reduction: ReductionInput =
      command.coverage === "full-tuition"
        ? { kind: "percentage", value: "100" }
        : { kind: command.kind, value: command.value }

    // The award is validated once against policy, before any invoice is touched,
    // so a refusal leaves nothing half-applied.
    const policy = financeConfiguration().scholarshipPolicy
    if (reduction.kind === "percentage") {
      const percent = Number(reduction.value)
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100)
        throw new FinanceError("negative-amount")
      if (percent > Number(policy.maxPercentage))
        throw new FinanceError("reduction-exceeds-limit", {
          limit: policy.maxPercentage,
        })
    } else if (compare(money(reduction.value), zero()) <= 0)
      throw new FinanceError("negative-amount")

    const targets = invoicesOf(command.studentId).filter(
      (invoice) =>
        invoice.status !== "cancelled" &&
        (!command.enrollmentId || invoice.enrollmentId === command.enrollmentId)
    )

    const approvedBy = { id: context.userId, name: context.userName, active: true }
    const scholarship: Scholarship = {
      id: nextId("scholarship") as ScholarshipId,
      studentId: command.studentId,
      enrollmentId: command.enrollmentId,
      name: command.name,
      kind: command.kind,
      value: command.value,
      coverage: command.coverage,
      reason: command.reason,
      approvedBy,
      approvedAt: context.now(),
    }
    store.scholarships.push(scholarship)
    invalidateIndexes()

    for (const invoice of targets) {
      const balance = balanceOf(invoice)
      // What is left to reduce: money already collected cannot be conjured away,
      // so the floor is the collected amount, not zero (spec FR-022).
      const headroom = clampToZero(
        subtract(balance.finalAmount, balance.netPaid)
      )
      if (isZero(headroom)) continue

      if (isEditable(invoice.status)) {
        // Pre-issuance: the invoice's own figures change. The discount in force is
        // re-resolved rather than carried as a frozen amount, so a 10% discount
        // stays 10% of the smaller remainder.
        const discountOnInvoice = discountsOf(invoice.id).at(-1)
        invoice.draft = computeFigures(
          invoice.draft.totalAmount,
          reduction,
          discountOnInvoice
            ? { kind: discountOnInvoice.kind, value: discountOnInvoice.value }
            : isZero(invoice.draft.discountTotal)
              ? undefined
              : { kind: "amount", value: invoice.draft.discountTotal.amount }
        )
      } else {
        // Post-issuance: an adjustment, clamped to the headroom so neither floor
        // is breached and the issued figures stay frozen (FR-023).
        const amount = min(resolveReduction(balance.finalAmount, reduction), headroom)
        if (isZero(amount)) continue
        store.adjustments.push({
          id: nextId("adjustment") as AdjustmentId,
          invoiceId: invoice.id,
          sourceKind: "scholarship",
          sourceId: scholarship.id,
          amount,
          reason: `${command.name} — ${command.reason}`,
          approvedBy,
          createdAt: context.now(),
        })
      }
      touch(invoice, context)
    }
    invalidateIndexes()

    appendEvent({
      studentId: command.studentId,
      category: "scholarship-applied",
      summary: `تم اعتماد منحة ${command.name}`,
      context,
      subjectRef: scholarship.id,
    })
    return this.getStudentFinancialProfile(command.studentId)
  },

  async requestRefund(command: RequestRefundCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, financePermissions.refundsRecord)

    const payment = store.payments.find((item) => item.id === command.paymentId)
    if (!payment) throw new FinanceError("refund-requires-payment")
    const invoice = findInvoice(payment.invoiceId, context)

    const priorRefunds = refundsOfPayment(payment.id).filter(
      (refund) => refund.status !== "cancelled" && refund.status !== "rejected"
    )
    const refundable = clampToZero(
      subtract(
        payment.amount,
        sum(priorRefunds.map((refund) => refund.amount), CURRENCY, PRECISION)
      )
    )
    const amount = money(command.amount)
    if (compare(amount, zero()) <= 0) throw new FinanceError("negative-amount")
    if (compare(amount, refundable) > 0)
      throw new FinanceError("refund-exceeds-payment", {
        refundable: refundable.amount,
      })

    const refund: Refund = {
      id: nextId("refund") as RefundId,
      paymentId: payment.id,
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      amount,
      reason: command.reason,
      refundDate: command.refundDate,
      status: "requested",
      requestedBy: { id: context.userId, name: context.userName, active: true },
      requestedAt: context.now(),
    }
    store.refunds.push(refund)
    invalidateIndexes()
    appendEvent({
      studentId: invoice.studentId,
      invoiceId: invoice.id,
      category: "refund-requested",
      summary: command.reason,
      amount,
      context,
      subjectRef: refund.id,
    })
    return toRefundSummary(refund)
  },

  async decideRefund(command: DecideRefundCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    const refund = store.refunds.find((item) => item.id === command.refundId)
    if (!refund) throw new FinanceError("not-found")
    const invoice = findInvoice(refund.invoiceId, context)

    const rule = refundTransitionRule(refund.status, command.decision)
    if (!rule) throw new FinanceError("validation-failed")
    // Authority first, then concurrency: a user who may not decide should be told
    // exactly that, not handed a version conflict that implies they otherwise could.
    require(context, rule.permission)
    // A refund decision is a decision about this invoice's money, so it is guarded
    // by the invoice aggregate like every other command (contracts, research R8).
    assertVersion(invoice, command.expectedVersion)
    if (rule.reasonRequired && !command.reason?.trim())
      throw new FinanceError("validation-failed")

    refund.status = command.decision
    refund.approvedBy = { id: context.userId, name: context.userName, active: true }
    refund.decidedAt = context.now()
    invalidateIndexes()
    return toRefundSummary(refund)
  },

  async completeRefund(command: CompleteRefundCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    const refund = store.refunds.find((item) => item.id === command.refundId)
    if (!refund) throw new FinanceError("not-found")
    const invoice = findInvoice(refund.invoiceId, context)

    const rule = refundTransitionRule(refund.status, "completed")
    if (!rule) throw new FinanceError("validation-failed")
    require(context, rule.permission)
    assertVersion(invoice, command.expectedVersion)

    refund.status = "completed"
    refund.completedAt = context.now()
    // Completion is the point where money moves, so the invoice aggregate itself
    // changes and its version must advance.
    touch(invoice, context)
    invalidateIndexes()
    appendEvent({
      studentId: refund.studentId,
      invoiceId: invoice.id,
      category: "refund-completed",
      summary: `تم إتمام الاسترداد`,
      amount: refund.amount,
      context,
      subjectRef: refund.id,
    })
    return toRefundSummary(refund)
  },
}

function toRefundSummary(refund: Refund): RefundSummary {
  const invoice = invoiceOf(refund.invoiceId)!
  const payment = store.payments.find((item) => item.id === refund.paymentId)
  return clone({
    id: refund.id,
    paymentId: refund.paymentId,
    receiptNumber: payment?.receiptNumber ?? "—",
    invoiceId: refund.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    studentId: invoice.studentId,
    studentCode: invoice.studentCode,
    studentName: invoice.studentName,
    branchLabel: branchLabel(invoice.branchId),
    amount: refund.amount,
    refundDate: refund.refundDate,
    status: refund.status,
    requestedByName: refund.requestedBy.name,
    approvedByName: refund.approvedBy?.name,
    version: invoice.version,
  })
}

/** Test-only helper: the net collected on an invoice, computed independently. */
export function collectedOn(invoiceId: InvoiceId): Money {
  const payments = paymentsOf(invoiceId)
  return sum(payments.map((payment) => payment.amount), CURRENCY, PRECISION)
}
