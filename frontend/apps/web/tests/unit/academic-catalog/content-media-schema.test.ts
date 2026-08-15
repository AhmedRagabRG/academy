import { describe, expect, it } from "vitest"
import {
  catalogAssetSchema,
  orderedContentSchema,
} from "@/features/academic-catalog/schemas/product-content-schema"
describe("catalog content", () => {
  it("requires accessible asset labels and supported size", () =>
    expect(
      catalogAssetSchema.safeParse({
        id: "a",
        kind: "gallery",
        fileName: "a.png",
        mimeType: "image/png",
        size: 20_000_000,
        url: "blob:a",
        label: "",
        position: 0,
      }).success
    ).toBe(false))
  it("accepts ordered content", () =>
    expect(
      orderedContentSchema.safeParse([{ id: "q1", title: "سؤال", position: 0 }])
        .success
    ).toBe(true))
})
