import { describe, expect, it } from "vitest"
import {
  formatRequestNumber,
  nextRequestSequence,
} from "@/features/accounting/utils/accounting-numbering"

const policy = { prefix: "EXP", yearSegment: "2026", padding: 5 }

describe("request numbering follows the configured pattern", () => {
  it("pads to the configured width", () => {
    expect(formatRequestNumber(policy, 1)).toBe("EXP-2026-00001")
    expect(formatRequestNumber(policy, 4321)).toBe("EXP-2026-04321")
  })

  it("honours a different prefix, year, and padding without a code change", () => {
    expect(
      formatRequestNumber({ prefix: "REQ", yearSegment: "2027", padding: 3 }, 7)
    ).toBe("REQ-2027-007")
  })

  it("does not truncate a sequence wider than the padding", () => {
    expect(formatRequestNumber(policy, 1234567)).toBe("EXP-2026-1234567")
  })

  it("omits an empty segment rather than leaving a stray separator", () => {
    expect(formatRequestNumber({ ...policy, prefix: "" }, 1)).toBe("2026-00001")
  })
})

describe("sequence allocation", () => {
  it("continues from the highest issued number", () => {
    expect(
      nextRequestSequence(["EXP-2026-00001", "EXP-2026-00007", "EXP-2026-00003"])
    ).toBe(8)
  })

  it("starts at one when nothing has been issued", () => {
    expect(nextRequestSequence([])).toBe(1)
  })

  it("ignores a malformed number rather than throwing", () => {
    expect(nextRequestSequence(["EXP-2026-00002", "not-a-number"])).toBe(3)
  })
})
