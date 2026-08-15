import { describe, expectTypeOf, it } from "vitest"
import type { Eligibility } from "@/features/program-batches"
describe("enrollment consumer contract", () => {
  it("exposes explainable eligibility and revision identity", () => {
    const projection = {} as Eligibility
    expectTypeOf(projection.financialRevisionId).toBeString()
    expectTypeOf(projection.reasons).toEqualTypeOf<string[]>()
  })
})
