import { describe, expect, it } from "vitest"
import { getTransitionPolicy } from "@/features/admissions/utils/admission-lifecycle"

describe("admission lifecycle", () => {
  it("allows governed transitions with exact permissions", () => {
    expect(getTransitionPolicy("draft", "submitted")?.permission).toBe(
      "admissions.submit"
    )
    expect(getTransitionPolicy("under-review", "approved")?.permission).toBe(
      "admissions.approve"
    )
  })

  it("prohibits lifecycle shortcuts and terminal enrollment changes", () => {
    expect(getTransitionPolicy("draft", "approved")).toBeUndefined()
    expect(getTransitionPolicy("enrolled", "archived")).toBeUndefined()
  })
})
