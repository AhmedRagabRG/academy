import { describe, expect, it } from "vitest"
import { productSchema } from "@/features/academic-catalog/schemas/product-schema"
import { emptyProductValues } from "@/features/academic-catalog/forms/product-editor-form"
import { catalogMoney } from "@/features/academic-catalog/utils/catalog-money"

const validDraft = {
  ...emptyProductValues,
  officialName: "دورة إدارة المشاريع",
  nameAr: "دورة إدارة المشاريع",
  nameEn: "Project Management",
  code: "PM-101",
  productTypeId: "type-course",
  categoryId: "category-business",
  description: "وصف أكاديمي واضح للمنتج",
}

/** Replaces one pricing field, leaving the rest of a valid draft intact. */
const withPricing = (field: string, value: unknown) => ({
  ...validDraft,
  pricing: { ...validDraft.pricing, [field]: value },
})

describe("product schema", () => {
  it("rejects incomplete identity", () => {
    expect(productSchema.safeParse(emptyProductValues).success).toBe(false)
  })

  it("accepts normalized draft values", () => {
    expect(productSchema.safeParse(validDraft).success).toBe(true)
  })

  describe("money is a decimal string, never a number", () => {
    // The catalog price is the head of the chain that ends in a student's
    // balance, so a float must not be representable here at all.
    it("rejects a bare number amount", () => {
      const result = productSchema.safeParse(
        withPricing("registrationFees", { ...catalogMoney("0"), amount: 500 })
      )
      expect(result.success).toBe(false)
    })

    it("rejects a bare number in place of the whole money value", () => {
      expect(productSchema.safeParse(withPricing("registrationFees", 500)).success).toBe(
        false
      )
    })

    it("rejects a negative amount", () => {
      const result = productSchema.safeParse(
        withPricing("registrationFees", { ...catalogMoney("0"), amount: "-1" })
      )
      expect(result.success).toBe(false)
    })

    it("rejects a non-numeric amount", () => {
      const result = productSchema.safeParse(
        withPricing("basePrice", { ...catalogMoney("0"), amount: "abc" })
      )
      expect(result.success).toBe(false)
    })

    it("rejects an empty amount", () => {
      const result = productSchema.safeParse(
        withPricing("basePrice", { ...catalogMoney("0"), amount: "" })
      )
      expect(result.success).toBe(false)
    })

    it("rejects money missing its precision", () => {
      const result = productSchema.safeParse(
        withPricing("basePrice", { amount: "18000.00", currency: "EGP" })
      )
      expect(result.success).toBe(false)
    })

    it("accepts a decimal string amount", () => {
      const result = productSchema.safeParse(
        withPricing("basePrice", catalogMoney("18000.50"))
      )
      expect(result.success).toBe(true)
    })

    it("keeps the amount a string after parsing", () => {
      const result = productSchema.safeParse(
        withPricing("basePrice", catalogMoney("18000.50"))
      )
      expect(result.success).toBe(true)
      if (result.success)
        expect(typeof result.data.pricing.basePrice.amount).toBe("string")
    })
  })
})
