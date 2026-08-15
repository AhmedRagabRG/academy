import { beforeEach, describe, expect, it } from "vitest"
import { academicCatalogService as service } from "@/features/academic-catalog/services/mock-academic-catalog-service"
describe("taxonomy service contract", () => {
  beforeEach(() => service.reset())
  it("archives and reactivates without deleting", async () => {
    const item = (await service.listCategories({ page: 1, pageSize: 10 }))
      .items[0]!
    const archived = await service.changeCategoryStatus({
      id: item.id,
      status: "archived",
      expectedVersion: item.version,
    })
    expect(archived.status).toBe("archived")
    const active = await service.changeCategoryStatus({
      id: item.id,
      status: "active",
      expectedVersion: archived.version,
    })
    expect(active.status).toBe("active")
  })
})
