import { describe, expect, it } from "vitest"
import { buildScaleBatches } from "@/features/program-batches"
import { batchQueryString } from "@/features/program-batches/utils/batch-list-query"
describe("batch list query", () => {
  it("serializes canonically and supports 10000 summaries", () => {
    expect(
      batchQueryString({ page: 2, pageSize: 10, status: "draft" })
    ).toContain("status=draft")
    expect(buildScaleBatches().length).toBe(10_000)
  })
})
