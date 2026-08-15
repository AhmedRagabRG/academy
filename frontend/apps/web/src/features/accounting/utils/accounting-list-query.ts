import {
  clampPaging,
  normalizeIds,
  normalizeRange,
  normalizeSearchTerm,
} from "@/shared/utils/list-query"
import type {
  CategoryListQuery,
  ExpenseRequestListQuery,
  SubCategoryListQuery,
} from "../types/commands"
import type {
  ExpenseCategoryId,
  ExpenseStatus,
  ExpenseSubCategoryId,
} from "../types/common"

export const defaultRequestListQuery: ExpenseRequestListQuery = {
  page: 1,
  pageSize: 20,
  sort: { field: "requestDate", direction: "desc" },
}

export const defaultCategoryListQuery: CategoryListQuery = { page: 1, pageSize: 20 }

export const defaultSubCategoryListQuery: SubCategoryListQuery = {
  page: 1,
  pageSize: 20,
}

/**
 * Normalizes a query so equivalent filters produce one cache key.
 *
 * Ids are sorted and de-duplicated, an empty filter becomes absent rather than an
 * empty array, and a range constraining nothing is dropped — otherwise the same
 * user misses their own cache after an unrelated reorder.
 */
export function normalizeRequestListQuery(
  query: ExpenseRequestListQuery
): ExpenseRequestListQuery {
  const search = query.search ? normalizeSearchTerm(query.search) : undefined
  return {
    search: search || undefined,
    branchIds: normalizeIds(query.branchIds),
    categoryIds: normalizeIds(query.categoryIds) as ExpenseCategoryId[] | undefined,
    subCategoryIds: normalizeIds(query.subCategoryIds) as
      | ExpenseSubCategoryId[]
      | undefined,
    requesterIds: normalizeIds(query.requesterIds),
    statuses: query.statuses?.length
      ? ([...new Set(query.statuses)].sort() as ExpenseStatus[])
      : undefined,
    dateRange: normalizeRange(query.dateRange),
    sort: query.sort ?? defaultRequestListQuery.sort,
    ...clampPaging(query.page, query.pageSize, 20),
  }
}

/** Whether anything is narrowing the list — drives "no matches" versus "none exist". */
export function hasActiveRequestFilters(query: ExpenseRequestListQuery): boolean {
  return Boolean(
    query.search ||
      query.branchIds?.length ||
      query.categoryIds?.length ||
      query.subCategoryIds?.length ||
      query.requesterIds?.length ||
      query.statuses?.length ||
      query.dateRange?.from ||
      query.dateRange?.to
  )
}

export function countActiveRequestFilters(query: ExpenseRequestListQuery): number {
  return [
    query.search,
    query.branchIds?.length,
    query.categoryIds?.length,
    query.subCategoryIds?.length,
    query.requesterIds?.length,
    query.statuses?.length,
    query.dateRange?.from || query.dateRange?.to,
  ].filter(Boolean).length
}
