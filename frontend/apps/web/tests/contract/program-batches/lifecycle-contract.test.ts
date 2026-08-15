import { beforeEach, describe, expect, it } from "vitest"
import {
  batchContract,
  resetBatchContract,
  testProgramId,
  validBatchInput,
} from "./test-helpers"
describe("lifecycle contract", () => {
  beforeEach(resetBatchContract)
  it("records a valid transition and rejects invalid transitions", async () => {
    const draft = await batchContract.create({
      programId: testProgramId,
      input: validBatchInput,
    })
    const opened = await batchContract.transition({
      programId: testProgramId,
      batchId: draft.id,
      toStatus: "registration-open",
      expectedVersion: draft.version,
      reason: "جاهزة",
    })
    expect(opened.lifecycle.at(-1)?.toStatus).toBe("registration-open")
    await expect(
      batchContract.transition({
        programId: testProgramId,
        batchId: opened.id,
        toStatus: "graduated",
        expectedVersion: opened.version,
        reason: "خطأ",
      })
    ).rejects.toMatchObject({ code: "invalid-transition" })
  })
})
