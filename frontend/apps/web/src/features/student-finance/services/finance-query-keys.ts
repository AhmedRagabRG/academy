import type { InvoiceId } from "../types/common"
import type {
  FinanceDashboardQuery,
  FinanceTimelineQuery,
  InstallmentListQuery,
  InvoiceListQuery,
  PaymentListQuery,
  RefundListQuery,
} from "../types/commands"
import {
  normalizeInstallmentListQuery,
  normalizeInvoiceListQuery,
  normalizePaymentListQuery,
  normalizeRefundListQuery,
  serializeQuery,
} from "../utils/finance-list-query"

const ROOT = "student-finance" as const

/**
 * Every key carries the scope fingerprint, so one user's scoped results are never
 * served to another context from cache.
 */
export const financeKeys = {
  all: [ROOT] as const,
  scope: (fingerprint: string) => [ROOT, fingerprint] as const,

  /** Prefix, so any money mutation invalidates every dashboard variant. */
  dashboards: (fingerprint: string) => [ROOT, fingerprint, "dashboard"] as const,
  dashboard: (fingerprint: string, query: FinanceDashboardQuery) =>
    [
      ROOT,
      fingerprint,
      "dashboard",
      serializeQuery(
        normalizeInvoiceListQuery({ ...query, page: 1, pageSize: 1 })
      ),
    ] as const,

  /**
   * The organization's letterhead. Unscoped on purpose: it is the same
   * document header for every branch and user, so scoping it would only
   * re-fetch the same rows per scope.
   */
  letterhead: () => [ROOT, "letterhead"] as const,

  invoiceLists: (fingerprint: string) => [ROOT, fingerprint, "invoices"] as const,
  invoices: (fingerprint: string, query: InvoiceListQuery) =>
    [ROOT, fingerprint, "invoices", serializeQuery(normalizeInvoiceListQuery(query))] as const,
  invoice: (fingerprint: string, invoiceId: InvoiceId) =>
    [ROOT, fingerprint, "invoice", invoiceId] as const,
  installmentPolicy: (fingerprint: string, invoiceId: InvoiceId) =>
    [ROOT, fingerprint, "invoice", invoiceId, "installment-policy"] as const,

  paymentLists: (fingerprint: string) => [ROOT, fingerprint, "payments"] as const,
  payments: (fingerprint: string, query: PaymentListQuery) =>
    [ROOT, fingerprint, "payments", serializeQuery(normalizePaymentListQuery(query))] as const,

  installmentLists: (fingerprint: string) =>
    [ROOT, fingerprint, "installments"] as const,
  installments: (fingerprint: string, query: InstallmentListQuery) =>
    [ROOT, fingerprint, "installments", serializeQuery(normalizeInstallmentListQuery(query))] as const,

  refundLists: (fingerprint: string) => [ROOT, fingerprint, "refunds"] as const,
  refunds: (fingerprint: string, query: RefundListQuery) =>
    [ROOT, fingerprint, "refunds", serializeQuery(normalizeRefundListQuery(query))] as const,

  profile: (fingerprint: string, studentId: string) =>
    [ROOT, fingerprint, "profile", studentId] as const,
  timeline: (
    fingerprint: string,
    studentId: string,
    query: Omit<FinanceTimelineQuery, "cursor">
  ) =>
    [
      ROOT,
      fingerprint,
      "timeline",
      studentId,
      JSON.stringify([query.limit, query.categories ?? []]),
    ] as const,
  lookups: (fingerprint: string) => [ROOT, fingerprint, "lookups"] as const,
}

/**
 * The Student Management financial-summary key.
 *
 * Every balance-affecting command invalidates it so the student workspace and the
 * finance workspace can never display different numbers. Constructed here rather
 * than imported so this module keeps no compile-time dependency on Student
 * Management's internal key factory.
 */
export function studentFinancialSummaryKey(
  fingerprint: string,
  studentId: string
): readonly unknown[] {
  return ["students", fingerprint, "finance", studentId]
}

export type FinanceMutationKind =
  | "invoice"
  | "payment"
  | "installments"
  | "reduction"
  | "refund"

/** What each command invalidates, including the cross-module summary key. */
export function invalidationTargets(input: {
  kind: FinanceMutationKind
  fingerprint: string
  studentId: string
  invoiceId?: InvoiceId
}): readonly (readonly unknown[])[] {
  const { kind, fingerprint, studentId, invoiceId } = input
  const always: (readonly unknown[])[] = [
    financeKeys.profile(fingerprint, studentId),
    financeKeys.timeline(fingerprint, studentId, { limit: 20 }),
    studentFinancialSummaryKey(fingerprint, studentId),
    // Every mutation here moves money, so collection totals are always stale.
    financeKeys.dashboards(fingerprint),
  ]
  if (invoiceId) always.push(financeKeys.invoice(fingerprint, invoiceId))

  switch (kind) {
    case "invoice":
    case "reduction":
      return [...always, financeKeys.invoiceLists(fingerprint)]
    case "installments":
      return [
        ...always,
        financeKeys.invoiceLists(fingerprint),
        financeKeys.installmentLists(fingerprint),
      ]
    case "payment":
      return [
        ...always,
        financeKeys.invoiceLists(fingerprint),
        financeKeys.paymentLists(fingerprint),
        financeKeys.installmentLists(fingerprint),
      ]
    case "refund":
      return [
        ...always,
        financeKeys.invoiceLists(fingerprint),
        financeKeys.refundLists(fingerprint),
        financeKeys.paymentLists(fingerprint),
      ]
  }
}
