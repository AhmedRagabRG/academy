import { describe, expect, it } from "vitest"
import {
  categorySchema,
  normalizeName,
  subCategorySchema,
} from "@/features/accounting/schemas/category-schemas"

describe("a category needs a usable name", () => {
  it("accepts a name and description", () => {
    expect(
      categorySchema.safeParse({ name: "التسويق", description: "الحملات" }).success
    ).toBe(true)
  })

  it("accepts an empty description, which is optional in substance", () => {
    expect(categorySchema.safeParse({ name: "التسويق", description: "" }).success).toBe(
      true
    )
  })

  it("refuses an empty or one-character name", () => {
    expect(categorySchema.safeParse({ name: "", description: "" }).success).toBe(false)
    expect(categorySchema.safeParse({ name: "أ", description: "" }).success).toBe(false)
  })

  it("refuses a whitespace-only name", () => {
    expect(categorySchema.safeParse({ name: "   ", description: "" }).success).toBe(
      false
    )
  })

  it("trims surrounding whitespace rather than storing it", () => {
    const parsed = categorySchema.parse({ name: "  التسويق  ", description: "  وصف  " })
    expect(parsed.name).toBe("التسويق")
    expect(parsed.description).toBe("وصف")
  })

  it("refuses an over-long description", () => {
    expect(
      categorySchema.safeParse({ name: "التسويق", description: "x".repeat(501) }).success
    ).toBe(false)
  })
})

describe("a sub-category needs a parent", () => {
  it("accepts one with a parent", () => {
    expect(
      subCategorySchema.safeParse({
        categoryId: "category-marketing",
        name: "إعلانات فيسبوك",
        description: "",
      }).success
    ).toBe(true)
  })

  it("refuses one with no parent", () => {
    expect(
      subCategorySchema.safeParse({
        categoryId: "",
        name: "إعلانات فيسبوك",
        description: "",
      }).success
    ).toBe(false)
  })
})

/**
 * Name comparison must not depend on invisible differences: "التسويق" and
 * "التسويق " are the same category to a user, and letting both exist produces two
 * indistinguishable rows in every picker.
 */
describe("name normalization for uniqueness", () => {
  it("ignores surrounding whitespace", () => {
    expect(normalizeName("  التسويق  ")).toBe(normalizeName("التسويق"))
  })

  it("collapses internal whitespace", () => {
    expect(normalizeName("إعلانات   فيسبوك")).toBe(normalizeName("إعلانات فيسبوك"))
  })

  it("ignores case for Latin names", () => {
    expect(normalizeName("Marketing")).toBe(normalizeName("marketing"))
  })

  it("keeps genuinely different names distinct", () => {
    expect(normalizeName("التسويق")).not.toBe(normalizeName("المكتب"))
  })
})
