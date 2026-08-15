import type { DateRange } from "../types/common"
import type {
  InstallmentListQuery,
  InvoiceListQuery,
  PaymentListQuery,
  RefundListQuery,
} from "../types/commands"

/**
 * These primitives now live in `@/shared/utils/list-query` — Accounting needed
 * identical semantics, and the inclusive-day rule in `isWithinRange` is a fixed
 * bug that must not exist in two places. Re-exported here so this module's public
 * surface is unchanged.
 */
export {
  MAX_PAGE_SIZE,
  normalizeDigits,
  normalizeArabic,
  normalizeSearchTerm,
  isInvertedRange,
  isWithinRange,
  serializeQuery,
  clampPage,
} from "@/shared/utils/list-query"

import {
  MAX_PAGE_SIZE,
  normalizeSearchTerm,
  normalizeRange,
} from "@/shared/utils/list-query"

const normalizeIds = (values?: string[]): string[] | undefined => {
  if (!values?.length) return undefined
  const unique = [...new Set(values.filter(Boolean))].sort()
  return unique.length ? unique : undefined
}

export const defaultInvoiceListQuery: InvoiceListQuery = {
  page: 1,
  pageSize: 20,
  sort: { field: "updatedAt", direction: "desc" },
}

export const defaultPaymentListQuery: PaymentListQuery = {
  page: 1,
  pageSize: 20,
  sort: { field: "paymentDate", direction: "desc" },
}

export const defaultInstallmentListQuery: InstallmentListQuery = {
  page: 1,
  pageSize: 20,
  sort: { field: "dueDate", direction: "asc" },
}

export const defaultRefundListQuery: RefundListQuery = {
  page: 1,
  pageSize: 20,
  sort: { field: "refundDate", direction: "desc" },
}

const clampPaging = (page: number, pageSize: number, fallbackSize: number) => ({
  page: Math.max(1, Math.trunc(page) || 1),
  pageSize: Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(pageSize) || fallbackSize)
  ),
})

export function normalizeInvoiceListQuery(
  query: InvoiceListQuery
): InvoiceListQuery {
  const search = query.search ? normalizeSearchTerm(query.search) : undefined
  return {
    search: search || undefined,
    branchIds: normalizeIds(query.branchIds),
    studentIds: normalizeIds(query.studentIds),
    offeringIds: normalizeIds(query.offeringIds),
    statuses: normalizeIds(query.statuses) as InvoiceListQuery["statuses"],
    dateRange: normalizeRange(query.dateRange),
    sort: query.sort ?? defaultInvoiceListQuery.sort,
    ...clampPaging(query.page, query.pageSize, 20),
  }
}

export function normalizePaymentListQuery(
  query: PaymentListQuery
): PaymentListQuery {
  const search = query.search ? normalizeSearchTerm(query.search) : undefined
  return {
    search: search || undefined,
    branchIds: normalizeIds(query.branchIds),
    studentIds: normalizeIds(query.studentIds),
    methodIds: normalizeIds(query.methodIds),
    dateRange: normalizeRange(query.dateRange),
    sort: query.sort ?? defaultPaymentListQuery.sort,
    ...clampPaging(query.page, query.pageSize, 20),
  }
}

export function normalizeInstallmentListQuery(
  query: InstallmentListQuery
): InstallmentListQuery {
  const search = query.search ? normalizeSearchTerm(query.search) : undefined
  return {
    search: search || undefined,
    branchIds: normalizeIds(query.branchIds),
    statuses: normalizeIds(query.statuses) as InstallmentListQuery["statuses"],
    dateRange: normalizeRange(query.dateRange),
    sort: query.sort ?? defaultInstallmentListQuery.sort,
    ...clampPaging(query.page, query.pageSize, 20),
  }
}

export function normalizeRefundListQuery(
  query: RefundListQuery
): RefundListQuery {
  const search = query.search ? normalizeSearchTerm(query.search) : undefined
  return {
    search: search || undefined,
    branchIds: normalizeIds(query.branchIds),
    statuses: normalizeIds(query.statuses) as RefundListQuery["statuses"],
    dateRange: normalizeRange(query.dateRange),
    sort: query.sort ?? defaultRefundListQuery.sort,
    ...clampPaging(query.page, query.pageSize, 20),
  }
}

export function hasActiveFilters(query: {
  search?: string
  branchIds?: string[]
  studentIds?: string[]
  offeringIds?: string[]
  methodIds?: string[]
  statuses?: string[]
  dateRange?: DateRange
}): boolean {
  return Boolean(
    query.search ||
      query.branchIds?.length ||
      query.studentIds?.length ||
      query.offeringIds?.length ||
      query.methodIds?.length ||
      query.statuses?.length ||
      (query.dateRange && (query.dateRange.from || query.dateRange.to))
  )
}
