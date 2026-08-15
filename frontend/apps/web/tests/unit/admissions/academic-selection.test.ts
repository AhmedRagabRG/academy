import { describe, expect, it } from "vitest"
import { validateAcademicSelection } from "@/features/admissions/utils/academic-selection"

describe("academic selection rules", () => {
  it("requires a batch for professional programs", () => {
    const result = validateAcademicSelection(
      { offeringKind: "professional-program", offeringId: "program-1" },
      {
        id: "program-1",
        kind: "professional-program",
        name: { ar: "برنامج", en: "Program" },
        code: "P1",
        status: "active",
        branchIds: ["branch-1"],
        version: 1,
        pricingRevisionId: "r1",
        price: { amount: "100", currency: "EGP", precision: 2 },
        registrationFees: { amount: "10", currency: "EGP", precision: 2 },
        documentPolicyId: "policy",
      }
    )
    expect(result.reasons).toContain("batch-required")
  })

  it("forbids batches for diplomas", () => {
    const result = validateAcademicSelection(
      {
        offeringKind: "professional-diploma",
        offeringId: "diploma-1",
        batchId: "batch-1",
      },
      {
        id: "diploma-1",
        kind: "professional-diploma",
        name: { ar: "دبلومة", en: "Diploma" },
        code: "D1",
        status: "active",
        branchIds: ["branch-1"],
        version: 1,
        pricingRevisionId: "r1",
        price: { amount: "100", currency: "EGP", precision: 2 },
        registrationFees: { amount: "10", currency: "EGP", precision: 2 },
        documentPolicyId: "policy",
      }
    )
    expect(result.reasons).toContain("batch-forbidden")
  })
})
