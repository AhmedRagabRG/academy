import { beforeEach, describe, expect, it } from "vitest"
import { academicCatalogService as service } from "@/features/academic-catalog/services/mock-academic-catalog-service"
describe("availability service contract", () => {
  beforeEach(() => service.reset())
  it("derives branch eligibility", async () => {
    await expect(
      service.getEligibility("product-leadership", "branch-cairo")
    ).resolves.toEqual({ eligible: true, reason: "eligible" })
    await expect(
      service.getEligibility("product-leadership", "missing")
    ).resolves.toEqual({ eligible: false, reason: "branch-inactive" })
  })
})
