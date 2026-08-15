import { describe, expect, it } from "vitest"
import {
  categorySchema,
  productTypeSchema,
} from "@/features/academic-catalog/schemas/taxonomy-schema"
describe("catalog taxonomy schemas", () => {
  it("requires localized names", () =>
    expect(
      categorySchema.safeParse({ nameAr: "", nameEn: "", description: "" })
        .success
    ).toBe(false))
  it("requires configured academic fields", () =>
    expect(
      productTypeSchema.safeParse({
        nameAr: "برنامج",
        nameEn: "Program",
        description: "وصف",
        fields: [],
      }).success
    ).toBe(false))
})
