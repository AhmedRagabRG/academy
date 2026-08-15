import { describe, expect, it } from "vitest"
import {
  countActiveRequestFilters,
  defaultRequestListQuery,
  hasActiveRequestFilters,
  normalizeRequestListQuery,
} from "@/features/accounting/utils/accounting-list-query"
import type { ExpenseCategoryId } from "@/features/accounting/types/common"

const base = { page: 1, pageSize: 20 }

describe("normalization makes equivalent queries one cache key", () => {
  it("sorts and de-duplicates id filters", () => {
    const normalized = normalizeRequestListQuery({
      ...base,
      branchIds: ["branch-b", "branch-a", "branch-b"],
    })
    expect(normalized.branchIds).toEqual(["branch-a", "branch-b"])
  })

  it("drops an empty id filter rather than keeping an empty array", () => {
    // An empty array and "no filter" must not be two different cache keys.
    expect(normalizeRequestListQuery({ ...base, branchIds: [] }).branchIds).toBeUndefined()
  })

  it("drops a blank search", () => {
    expect(normalizeRequestListQuery({ ...base, search: "   " }).search).toBeUndefined()
  })

  it("normalizes Arabic-Indic digits and spacing in search", () => {
    expect(normalizeRequestListQuery({ ...base, search: "  EXP-٢٠٢٦  " }).search).toBe(
      "exp-2026"
    )
  })

  it("drops a range that constrains nothing", () => {
    expect(
      normalizeRequestListQuery({
        ...base,
        dateRange: { field: "requestDate" },
      }).dateRange
    ).toBeUndefined()
  })

  it("keeps a range with either bound", () => {
    expect(
      normalizeRequestListQuery({
        ...base,
        dateRange: { field: "requestDate", from: "2026-01-01" },
      }).dateRange
    ).toEqual({ field: "requestDate", from: "2026-01-01" })
  })

  it("sorts and de-duplicates statuses", () => {
    expect(
      normalizeRequestListQuery({
        ...base,
        statuses: ["submitted", "draft", "submitted"],
      }).statuses
    ).toEqual(["draft", "submitted"])
  })

  it("applies the default sort when none is given", () => {
    expect(normalizeRequestListQuery(base).sort).toEqual(defaultRequestListQuery.sort)
  })
})

describe("paging is clamped, never discarded", () => {
  it("caps an absurd page size", () => {
    expect(normalizeRequestListQuery({ page: 1, pageSize: 5000 }).pageSize).toBe(100)
  })

  it("floors a nonsense page", () => {
    expect(normalizeRequestListQuery({ page: 0, pageSize: 20 }).page).toBe(1)
    expect(normalizeRequestListQuery({ page: -4, pageSize: 20 }).page).toBe(1)
  })

  it("falls back to the default size for zero", () => {
    expect(normalizeRequestListQuery({ page: 1, pageSize: 0 }).pageSize).toBe(20)
  })
})

/**
 * "No request matched these filters" and "no request exists" are different facts,
 * and the empty state must be able to tell them apart (spec FR-042).
 */
describe("active-filter detection", () => {
  it("reports nothing active for a bare query", () => {
    expect(hasActiveRequestFilters(base)).toBe(false)
    expect(countActiveRequestFilters(base)).toBe(0)
  })

  it("reports each kind of filter as active", () => {
    expect(hasActiveRequestFilters({ ...base, search: "x" })).toBe(true)
    expect(hasActiveRequestFilters({ ...base, statuses: ["draft"] })).toBe(true)
    expect(hasActiveRequestFilters({ ...base, branchIds: ["b"] })).toBe(true)
    expect(
      hasActiveRequestFilters({
        ...base,
        categoryIds: ["category-x" as ExpenseCategoryId],
      })
    ).toBe(true)
    expect(
      hasActiveRequestFilters({
        ...base,
        dateRange: { field: "requestDate", from: "2026-01-01" },
      })
    ).toBe(true)
  })

  it("counts several filters", () => {
    expect(
      countActiveRequestFilters({
        ...base,
        search: "x",
        statuses: ["draft"],
        branchIds: ["b"],
      })
    ).toBe(3)
  })

  it("does not count an empty array as a filter", () => {
    expect(countActiveRequestFilters({ ...base, branchIds: [], statuses: [] })).toBe(0)
  })
})
