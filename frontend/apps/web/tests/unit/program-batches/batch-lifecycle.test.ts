import { describe, expect, it } from "vitest"
import { transitions } from "@/features/program-batches/utils/batch-lifecycle"
describe("batch lifecycle", () => {
  it("allows only governed transitions", () => {
    expect(transitions.draft).toEqual(["registration-open", "archived"])
    expect(transitions.archived).toEqual([])
    expect(transitions.studying).not.toContain("draft")
  })
})
