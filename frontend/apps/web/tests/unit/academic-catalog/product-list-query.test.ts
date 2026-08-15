import { afterEach, describe, expect, it } from "vitest"
import {
  parseProductQuery,
  serializeProductQuery,
} from "@/features/academic-catalog/utils/product-list-query"
import { academicCatalogService as service } from "@/features/academic-catalog/services/mock-academic-catalog-service"
import { catalogMockScenarios } from "@/features/academic-catalog/services/mock-scenario-controller"
import { emptyProductValues } from "@/features/academic-catalog/forms/product-editor-form"
import { catalogMoney } from "@/features/academic-catalog/utils/catalog-money"
describe("product list query", () => {
  afterEach(() => service.reset())
  it("round trips filters and clamps pagination", () => {
    const query = parseProductQuery(
      new URLSearchParams(
        "search=lead&type=t1&status=active&page=-2&pageSize=500"
      )
    )
    expect(query.page).toBe(1)
    expect(query.pageSize).toBe(100)
    expect(serializeProductQuery(query)).toContain("status=active")
  })
  it("paginates the deterministic 10,000 product scenario", async () => {
    catalogMockScenarios.set("scale")
    const result = await service.listProducts({
      page: 100,
      pageSize: 25,
      search: "برنامج",
    })
    expect(result.total).toBe(10_000)
    expect(result.items).toHaveLength(25)
    expect(result.page).toBe(100)
  })

  /**
   * Sorting prices as text ordered "18000.00" before "9500.00", because "1"
   * precedes "9". These assert the ordering agrees with the value, which only
   * holds when the comparison runs in integer minor units.
   */
  describe("price sorting is numeric, not lexicographic", () => {
    const draft = (code: string, price: string) => ({
      ...emptyProductValues,
      officialName: `منتج ${code}`,
      nameAr: `منتج ${code}`,
      nameEn: `Product ${code}`,
      code,
      productTypeId: "type-course",
      categoryId: "category-business",
      description: "وصف أكاديمي واضح للمنتج",
      pricing: { ...emptyProductValues.pricing, basePrice: catalogMoney(price) },
    })

    const pricesInOrder = async (direction: "asc" | "desc") => {
      const result = await service.listProducts({
        page: 1,
        pageSize: 50,
        sort: "price",
        direction,
      })
      return result.items.map((item) => item.basePrice.amount)
    }

    it("orders a cheaper multi-digit price before a dearer shorter one", async () => {
      await service.createDraft(draft("CHEAP-01", "9500.00"))
      await service.createDraft(draft("DEAR-01", "18000.00"))

      const ascending = await pricesInOrder("asc")
      expect(ascending.indexOf("9500.00")).toBeLessThan(
        ascending.indexOf("18000.00")
      )
    })

    it("reverses cleanly", async () => {
      await service.createDraft(draft("CHEAP-02", "9500.00"))
      await service.createDraft(draft("DEAR-02", "18000.00"))

      const descending = await pricesInOrder("desc")
      expect(descending.indexOf("18000.00")).toBeLessThan(
        descending.indexOf("9500.00")
      )
    })

    it("orders sub-unit differences correctly", async () => {
      await service.createDraft(draft("MINOR-LOW", "100.05"))
      await service.createDraft(draft("MINOR-HIGH", "100.40"))

      const ascending = await pricesInOrder("asc")
      expect(ascending.indexOf("100.05")).toBeLessThan(
        ascending.indexOf("100.40")
      )
    })
  })
})
