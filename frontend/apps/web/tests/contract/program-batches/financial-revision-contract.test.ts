import { beforeEach, describe, expect, it } from "vitest"
import {
  batchContract,
  resetBatchContract,
  testProgramId,
  validBatchInput,
} from "./test-helpers"
import { batchMoney } from "@/features/program-batches/utils/batch-money"
describe("financial revision contract", () => {
  beforeEach(resetBatchContract)
  it("appends immutable revisions when pricing changes", async () => {
    const created = await batchContract.create({
      programId: testProgramId,
      input: validBatchInput,
    })
    const previous = created.financialProfile.currentRevisionId
    const updated = await batchContract.update({
      programId: testProgramId,
      batchId: created.id,
      input: {
        ...validBatchInput,
        financialProfile: {
          ...validBatchInput.financialProfile,
          programPrice: batchMoney("1200"),
        },
      },
      expectedVersion: created.version,
    })
    expect(updated.financialProfile.currentRevisionId).not.toBe(previous)
    expect((await batchContract.revisions(created.id)).length).toBe(2)
  })
})
