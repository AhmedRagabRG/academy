import { beforeEach, describe, expect, it } from "vitest"
import { academicCatalogService as service } from "@/features/academic-catalog/services/mock-academic-catalog-service"
describe("product service contract", () => {
  beforeEach(() => service.reset())
  it("returns details and locks identity after activation", async () => {
    const product = await service.getProduct("product-leadership")
    await expect(
      service.updateProduct({
        ...product,
        code: "CHANGED",
        id: product.id,
        expectedVersion: product.version,
      })
    ).rejects.toMatchObject({
      code: "CODE_LOCKED",
    })
  })
  it("returns server-shaped pagination", async () => {
    const result = await service.listProducts({ page: 1, pageSize: 10 })
    expect(result.page).toBe(1)
    expect(result.total).toBeGreaterThan(0)
  })
})
