import { beforeEach, describe, expect, it } from "vitest"
import {
  batchContract,
  resetBatchContract,
  testProgramId,
} from "./test-helpers"
import type { ProgramBatchId } from "@/features/program-batches/types/common"
describe("capacity and branches contract", () => {
  beforeEach(resetBatchContract)
  it("derives eligibility from registration branches", async () => {
    const eligible = await batchContract.eligibility(
      "batch-fall-2026" as ProgramBatchId,
      "branch-cairo",
      "2026-08-01"
    )
    const denied = await batchContract.eligibility(
      "batch-fall-2026" as ProgramBatchId,
      "branch-giza",
      "2026-08-01"
    )
    expect(eligible.eligible).toBe(true)
    expect(denied.reasons).toContain("registration-branch-not-assigned")
  })
  it("returns distinct configured branch roles", async () => {
    const batch = await batchContract.get(
      testProgramId,
      "batch-fall-2026" as ProgramBatchId
    )
    expect(batch.branchAssignments.some((x) => x.role === "registration")).toBe(
      true
    )
    expect(batch.branchAssignments.some((x) => x.role === "study")).toBe(true)
  })
})
