import { describe, expect, it } from "vitest"
import { productSchema } from "@/features/academic-catalog/schemas/product-schema"
describe("catalog command boundaries", () => {
  it("does not accept editable tenant or actor fields in the schema", () => {
    expect("organizationId" in productSchema.shape).toBe(false)
    expect("createdBy" in productSchema.shape).toBe(false)
  })
})
