import { beforeEach, describe, expect, it } from "vitest"
import { academicCatalogService as service } from "@/features/academic-catalog/services/mock-academic-catalog-service"
describe("product lifecycle contract", () => {
  beforeEach(() => service.reset())
  it("records valid transitions and rejects invalid ones", async () => {
    const product = await service.getProduct("product-leadership")
    const closed = await service.transitionProduct({
      id: product.id,
      toStatus: "closed",
      reason: "انتهاء التسجيل",
      expectedVersion: product.version,
    })
    expect(closed.lifecycle.at(-1)?.to).toBe("closed")
    await expect(
      service.transitionProduct({
        id: closed.id,
        toStatus: "hidden",
        expectedVersion: closed.version,
      })
    ).rejects.toMatchObject({ code: "TRANSITION_INVALID" })
  })
})
