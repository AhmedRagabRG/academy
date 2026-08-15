import { describe, expect, it } from "vitest"
import { academicCatalogNavigation } from "@/features/academic-catalog/config/navigation"
import { catalogKeys } from "@/features/academic-catalog/services/academic-catalog-query-keys"
describe("academic catalog foundation", () => {
  it("registers configuration-driven child routes", () => {
    expect(academicCatalogNavigation.route).toBe("/academic-catalog")
    expect(academicCatalogNavigation.children).toHaveLength(4)
    expect(
      academicCatalogNavigation.children?.every((item) => item.permissionKey)
    ).toBe(true)
  })
  it("uses stable hierarchical keys", () =>
    expect(catalogKeys.product("p1")).toEqual([
      "academic-catalog",
      "products",
      "detail",
      "p1",
    ]))
})
