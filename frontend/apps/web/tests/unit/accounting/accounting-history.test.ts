import { describe, expect, it } from "vitest"
import {
  compareEntries,
  nextSequence,
  sortHistory,
} from "@/features/accounting/utils/accounting-history"
import type { HistoryEntry } from "@/features/accounting/types/domain"

const entry = (
  id: string,
  occurredAt: string,
  sequence: number
): HistoryEntry =>
  ({
    id,
    requestId: "request-1",
    action: "submitted",
    fromStatus: "draft",
    toStatus: "submitted",
    performedBy: { id: "e1", name: "موظف", active: true },
    occurredAt,
    sequence,
  }) as HistoryEntry

/** Deliberately out of order, with two entries sharing an instant. */
const entries = [
  entry("c", "2026-03-01T00:00:00.000Z", 3),
  entry("a", "2026-01-01T00:00:00.000Z", 1),
  entry("d", "2026-03-01T00:00:00.000Z", 4),
  entry("b", "2026-02-01T00:00:00.000Z", 2),
]

describe("history reads oldest first", () => {
  it("orders chronologically", () => {
    expect(sortHistory(entries).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ])
  })

  it("breaks a shared timestamp by sequence", () => {
    // Without the tiebreak, two entries written in the same instant would order
    // arbitrarily — and an injected clock makes that the common case, not a rare one.
    expect(
      compareEntries(
        entry("c", "2026-03-01T00:00:00.000Z", 3),
        entry("d", "2026-03-01T00:00:00.000Z", 4)
      )
    ).toBeLessThan(0)
  })

  it("is a total order — no two distinct entries compare equal", () => {
    const sorted = sortHistory(entries)
    for (let index = 1; index < sorted.length; index += 1)
      expect(compareEntries(sorted[index - 1]!, sorted[index]!)).toBeLessThan(0)
  })

  it("does not mutate its input", () => {
    const input = [...entries]
    sortHistory(input)
    expect(input.map((item) => item.id)).toEqual(["c", "a", "d", "b"])
  })

  it("handles an empty history", () => {
    expect(sortHistory([])).toEqual([])
  })
})

describe("sequence allocation", () => {
  it("continues from the highest existing sequence", () => {
    expect(nextSequence(entries)).toBe(5)
  })

  it("starts at one for a request with no history yet", () => {
    expect(nextSequence([])).toBe(1)
  })

  it("does not depend on array order", () => {
    expect(nextSequence([...entries].reverse())).toBe(5)
  })
})
