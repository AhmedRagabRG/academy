import type { StudentListQuery } from "../types/commands"
import { normalizeSearchTerm } from "./student-identity-rules"

export const MAX_PAGE_SIZE = 100

export const defaultStudentListQuery: StudentListQuery = {
  page: 1,
  pageSize: 20,
  sort: { field: "updatedAt", direction: "desc" },
}

const normalizeIds = (values?: string[]): string[] | undefined => {
  if (!values?.length) return undefined
  const unique = [...new Set(values.filter(Boolean))].sort()
  return unique.length ? unique : undefined
}

/**
 * One normalization pass shared by the service and the query-key factory, so the
 * same logical query always produces the same cache key and the same results.
 */
export function normalizeStudentListQuery(
  query: StudentListQuery
): StudentListQuery {
  const search = query.search ? normalizeSearchTerm(query.search) : undefined
  return {
    search: search || undefined,
    branchIds: normalizeIds(query.branchIds),
    departmentIds: normalizeIds(query.departmentIds),
    offeringIds: normalizeIds(query.offeringIds),
    batchIds: normalizeIds(query.batchIds),
    statuses: normalizeIds(query.statuses) as StudentListQuery["statuses"],
    customerServiceEmployeeIds: normalizeIds(query.customerServiceEmployeeIds),
    sort: query.sort ?? defaultStudentListQuery.sort,
    page: Math.max(1, Math.trunc(query.page) || 1),
    pageSize: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.trunc(query.pageSize) || defaultStudentListQuery.pageSize)
    ),
  }
}

/** Stable serialization used as the list cache key. */
export function serializeStudentListQuery(query: StudentListQuery): string {
  const normalized = normalizeStudentListQuery(query)
  return JSON.stringify([
    normalized.search ?? "",
    normalized.branchIds ?? [],
    normalized.departmentIds ?? [],
    normalized.offeringIds ?? [],
    normalized.batchIds ?? [],
    normalized.statuses ?? [],
    normalized.customerServiceEmployeeIds ?? [],
    normalized.sort?.field ?? "",
    normalized.sort?.direction ?? "",
    normalized.page,
    normalized.pageSize,
  ])
}

/**
 * Keeps the page valid when filters change: clamp into range rather than dropping
 * the filters the employee just set (spec US2-4).
 */
export function clampPage(query: StudentListQuery, total: number): number {
  const pageSize = Math.max(1, query.pageSize)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return Math.min(Math.max(1, query.page), totalPages)
}

export function hasActiveFilters(query: StudentListQuery): boolean {
  const normalized = normalizeStudentListQuery(query)
  return Boolean(
    normalized.search ||
      normalized.branchIds ||
      normalized.departmentIds ||
      normalized.offeringIds ||
      normalized.batchIds ||
      normalized.statuses ||
      normalized.customerServiceEmployeeIds
  )
}

export function clearFilters(query: StudentListQuery): StudentListQuery {
  return { ...defaultStudentListQuery, pageSize: query.pageSize }
}
