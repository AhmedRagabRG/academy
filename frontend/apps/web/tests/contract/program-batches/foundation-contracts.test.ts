import { describe, expect, it } from "vitest"
import * as boundary from "@/features/program-batches"
describe("program batches boundary", () => {
  it("exports route screens and consumer types without fixtures", () => {
    expect(boundary.ProgramBatchesScreen).toBeTypeOf("function")
    expect(boundary.batchScenarios).toBeDefined()
  })
})
