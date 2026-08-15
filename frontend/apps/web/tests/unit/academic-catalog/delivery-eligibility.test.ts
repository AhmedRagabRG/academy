import { describe, expect, it } from "vitest"
import { getEligibility } from "@/features/academic-catalog/utils/catalog-rules"
// eslint-disable-next-line no-restricted-imports
import {
  products,
  catalogLookups,
} from "@/features/academic-catalog/data/catalog-fixtures"
describe("enrollment eligibility", () => {
  it("uses active status and registration assignment", () => {
    expect(
      getEligibility(products[0]!, "branch-cairo", catalogLookups)
    ).toEqual({ eligible: true, reason: "eligible" })
    expect(
      getEligibility(
        { ...products[0]!, status: "hidden" },
        "branch-cairo",
        catalogLookups
      ).eligible
    ).toBe(false)
  })
})
