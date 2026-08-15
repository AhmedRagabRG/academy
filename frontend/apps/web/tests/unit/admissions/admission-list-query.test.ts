import { describe, expect, it } from "vitest"
import {
  normalizeAdmissionListQuery,
  normalizeAdmissionSearch,
} from "@/features/admissions/utils/admission-list-query"

describe("admission list query", () => {
  it("normalizes Arabic search and clamps pagination", () => {
    expect(normalizeAdmissionSearch("  أحمد-على ")).toBe("احمد علي")
    expect(normalizeAdmissionListQuery({ page: -3, pageSize: 999 }).page).toBe(
      1
    )
    expect(
      normalizeAdmissionListQuery({ page: 1, pageSize: 999 }).pageSize
    ).toBe(100)
  })
})
