import { beforeEach, describe, expect, it } from "vitest"
import {
  batchContract,
  resetBatchContract,
  testProgramId,
} from "./test-helpers"
describe("batch list contract", () => {
  beforeEach(resetBatchContract)
  it("filters and paginates in the service", async () => {
    const page = await batchContract.list(testProgramId, {
      search: "PLP-F26",
      status: "registration-open",
      page: 1,
      pageSize: 10,
    })
    expect(page.total).toBe(1)
    expect(page.items[0]?.code).toBe("PLP-F26")
  })
})
