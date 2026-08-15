import { describe, expect, it } from "vitest"
import {
  clampPage,
  clearFilters,
  defaultStudentListQuery,
  hasActiveFilters,
  normalizeStudentListQuery,
  serializeStudentListQuery,
} from "@/features/students/utils/student-list-query"
import {
  normalizeArabic,
  normalizeDigits,
  normalizePhone,
  normalizeSearchTerm,
} from "@/features/students/utils/student-identity-rules"

describe("search normalization", () => {
  it("folds Arabic-Indic digits to ASCII", () => {
    expect(normalizeDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789")
    expect(normalizeDigits("۰۱۲۳")).toBe("0123")
  })

  it("folds Arabic letter variants so name spellings match", () => {
    expect(normalizeArabic("أحمد")).toBe(normalizeArabic("احمد"))
    expect(normalizeArabic("إبراهيم")).toBe(normalizeArabic("ابراهيم"))
    expect(normalizeArabic("ليلى")).toBe(normalizeArabic("ليلي"))
  })

  it("collapses whitespace and lowercases", () => {
    expect(normalizeSearchTerm("  STD-2026   00001 ")).toBe("std-2026 00001")
  })

  it("strips separators from phone numbers", () => {
    expect(normalizePhone("010 1234-5678")).toBe("01012345678")
    expect(normalizePhone("(010) 1234 5678")).toBe("01012345678")
  })
})

describe("list query normalization", () => {
  it("dedupes and sorts filter arrays so equivalent queries share a cache key", () => {
    const left = normalizeStudentListQuery({
      ...defaultStudentListQuery,
      branchIds: ["branch-b", "branch-a", "branch-b"],
    })
    const right = normalizeStudentListQuery({
      ...defaultStudentListQuery,
      branchIds: ["branch-a", "branch-b"],
    })
    expect(left.branchIds).toEqual(["branch-a", "branch-b"])
    expect(serializeStudentListQuery(left)).toBe(
      serializeStudentListQuery(right)
    )
  })

  it("drops empty filters rather than storing empty arrays", () => {
    const normalized = normalizeStudentListQuery({
      ...defaultStudentListQuery,
      branchIds: [],
      search: "   ",
    })
    expect(normalized.branchIds).toBeUndefined()
    expect(normalized.search).toBeUndefined()
  })

  it("clamps page and page size into range", () => {
    const normalized = normalizeStudentListQuery({
      page: -5,
      pageSize: 5000,
    })
    expect(normalized.page).toBe(1)
    expect(normalized.pageSize).toBe(100)
  })

  it("applies the default sort when none is supplied", () => {
    expect(normalizeStudentListQuery({ page: 1, pageSize: 20 }).sort).toEqual({
      field: "updatedAt",
      direction: "desc",
    })
  })
})

describe("page clamping", () => {
  it("clamps a now-invalid page into range instead of resetting to one", () => {
    expect(clampPage({ page: 9, pageSize: 20 }, 45)).toBe(3)
  })

  it("never returns a page below one", () => {
    expect(clampPage({ page: 4, pageSize: 20 }, 0)).toBe(1)
  })
})

describe("filter helpers", () => {
  it("detects active filters", () => {
    expect(hasActiveFilters(defaultStudentListQuery)).toBe(false)
    expect(
      hasActiveFilters({ ...defaultStudentListQuery, statuses: ["active"] })
    ).toBe(true)
  })

  it("clears filters while preserving page size", () => {
    const cleared = clearFilters({
      ...defaultStudentListQuery,
      pageSize: 50,
      statuses: ["archived"],
      search: "test",
    })
    expect(cleared.statuses).toBeUndefined()
    expect(cleared.search).toBeUndefined()
    expect(cleared.pageSize).toBe(50)
  })
})
