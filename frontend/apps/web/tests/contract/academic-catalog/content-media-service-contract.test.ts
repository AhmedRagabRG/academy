import { beforeEach, describe, expect, it } from "vitest"
import { academicCatalogService as service } from "@/features/academic-catalog/services/mock-academic-catalog-service"
describe("content and media contract", () => {
  beforeEach(() => service.reset())
  it("returns structured ordered content", async () => {
    const product = await service.getProduct("product-leadership")
    expect(Array.isArray(product.content.faqs)).toBe(true)
    expect(Array.isArray(product.content.admissionRequirements)).toBe(true)
    expect(Array.isArray(product.content.requiredDocuments)).toBe(true)
  })
})
