import { beforeEach, describe, expect, it } from "vitest"
import {
  batchContract,
  resetBatchContract,
  testProgramId,
  validBatchInput,
} from "./test-helpers"
describe("batch management contract", () => {
  beforeEach(resetBatchContract)
  it("creates and updates an independent draft with versions", async () => {
    const created = await batchContract.create({
      programId: testProgramId,
      input: validBatchInput,
    })
    expect(created.status).toBe("draft")
    const updated = await batchContract.update({
      programId: testProgramId,
      batchId: created.id,
      input: { ...validBatchInput, name: { ar: "دفعة محدثة" } },
      expectedVersion: created.version,
    })
    expect(updated.name.ar).toBe("دفعة محدثة")
    expect(updated.version).toBe(created.version + 1)
  })
  it("rejects duplicate codes", async () => {
    await batchContract.create({
      programId: testProgramId,
      input: validBatchInput,
    })
    await expect(
      batchContract.create({ programId: testProgramId, input: validBatchInput })
    ).rejects.toMatchObject({ code: "duplicate-code" })
  })
})
