import { describe, expect, it } from "vitest"
import {
  compareEvents,
  decodeCursor,
  encodeCursor,
  nextSequence,
  pageTimeline,
  sortTimeline,
} from "@/features/student-finance/utils/finance-timeline"
import type { FinanceTimelineEvent } from "@/features/student-finance/types/domain"

const event = (
  id: string,
  occurredAt: string,
  sequence: number,
  category: FinanceTimelineEvent["category"] = "payment-received"
): FinanceTimelineEvent =>
  ({
    id,
    studentId: "student-1",
    category,
    occurredAt,
    sequence,
    actor: { id: "employee-1", name: "موظف مالي", active: true },
    summary: "حدث",
  }) as FinanceTimelineEvent

/** Deliberately out of order, with two events sharing a timestamp. */
const events = [
  event("a", "2026-01-01T00:00:00.000Z", 1),
  event("c", "2026-03-01T00:00:00.000Z", 3),
  event("b", "2026-02-01T00:00:00.000Z", 2),
  event("d", "2026-03-01T00:00:00.000Z", 4),
]

describe("ordering", () => {
  it("puts the newest first", () => {
    expect(sortTimeline(events).map((item) => item.id)).toEqual([
      "d",
      "c",
      "b",
      "a",
    ])
  })

  it("breaks a timestamp tie by sequence, newest first", () => {
    // c and d share an instant; the later sequence is the later event.
    expect(compareEvents(event("d", "2026-03-01T00:00:00.000Z", 4), event("c", "2026-03-01T00:00:00.000Z", 3))).toBeLessThan(0)
  })

  it("does not mutate the input", () => {
    const input = [...events]
    sortTimeline(input)
    expect(input.map((item) => item.id)).toEqual(["a", "c", "b", "d"])
  })

  it("is a total order — no two distinct events compare equal", () => {
    const sorted = sortTimeline(events)
    for (let index = 1; index < sorted.length; index += 1)
      expect(compareEvents(sorted[index - 1]!, sorted[index]!)).toBeLessThan(0)
  })
})

describe("the cursor", () => {
  it("round-trips a position", () => {
    const cursor = encodeCursor(events[1]!)
    expect(decodeCursor(cursor)).toEqual({
      occurredAt: "2026-03-01T00:00:00.000Z",
      sequence: 3,
    })
  })

  it("survives a timestamp containing the separator's neighbours", () => {
    const cursor = encodeCursor(event("x", "2026-03-01T00:00:00.000Z", 12))
    expect(decodeCursor(cursor)?.sequence).toBe(12)
  })

  it("rejects a malformed cursor rather than guessing", () => {
    for (const cursor of ["", "nonsense", "|", "2026-01-01T00:00:00.000Z|abc"])
      expect(decodeCursor(cursor), cursor).toBeUndefined()
  })
})

describe("paging", () => {
  it("returns the first page newest-first with a next cursor", () => {
    const page = pageTimeline(events, { limit: 2 })
    expect(page.items.map((item) => item.id)).toEqual(["d", "c"])
    expect(page.nextCursor).toBeDefined()
  })

  it("continues from the cursor without repeating or skipping", () => {
    const first = pageTimeline(events, { limit: 2 })
    const second = pageTimeline(events, { limit: 2, cursor: first.nextCursor })
    expect(second.items.map((item) => item.id)).toEqual(["b", "a"])
    expect(second.nextCursor).toBeUndefined()
  })

  it("walks the whole set exactly once across pages", () => {
    const seen: string[] = []
    let cursor: string | undefined
    do {
      const page = pageTimeline(events, { limit: 1, cursor })
      seen.push(...page.items.map((item) => item.id))
      cursor = page.nextCursor
    } while (cursor)

    expect(seen).toEqual(["d", "c", "b", "a"])
    expect(new Set(seen).size).toBe(seen.length)
  })

  /**
   * The reason for keyset paging rather than offsets: an event appended while a
   * reader is part-way down the list shifts every offset, repeating one row and
   * skipping another.
   */
  it("stays stable when a newer event is appended mid-paging", () => {
    const first = pageTimeline(events, { limit: 2 })
    const withNewer = [...events, event("e", "2026-09-01T00:00:00.000Z", 5)]
    const second = pageTimeline(withNewer, {
      limit: 2,
      cursor: first.nextCursor,
    })
    expect(second.items.map((item) => item.id)).toEqual(["b", "a"])
  })

  it("stays stable when an event is appended at the same instant as the cursor", () => {
    const first = pageTimeline(events, { limit: 2 })
    // Same timestamp as "c", but a later sequence — it belongs on the first page.
    const withTie = [...events, event("e", "2026-03-01T00:00:00.000Z", 5)]
    const second = pageTimeline(withTie, { limit: 2, cursor: first.nextCursor })
    expect(second.items.map((item) => item.id)).toEqual(["b", "a"])
  })

  it("reports no next cursor on the last page", () => {
    expect(pageTimeline(events, { limit: 10 }).nextCursor).toBeUndefined()
  })

  it("handles an empty set", () => {
    const page = pageTimeline([], { limit: 10 })
    expect(page.items).toEqual([])
    expect(page.nextCursor).toBeUndefined()
  })

  it("clamps an absurd limit", () => {
    const many = Array.from({ length: 300 }, (_, index) =>
      event(`e${index}`, `2026-01-01T00:00:00.000Z`, index + 1)
    )
    expect(pageTimeline(many, { limit: 5000 }).items.length).toBeLessThanOrEqual(100)
  })

  it("treats a zero or negative limit as one", () => {
    expect(pageTimeline(events, { limit: 0 }).items).toHaveLength(1)
    expect(pageTimeline(events, { limit: -5 }).items).toHaveLength(1)
  })

  it("ignores a cursor it cannot decode rather than returning nothing", () => {
    const page = pageTimeline(events, { limit: 10, cursor: "nonsense" })
    expect(page.items).toHaveLength(events.length)
  })
})

describe("category filtering", () => {
  const mixed = [
    ...events,
    event("r", "2026-07-01T00:00:00.000Z", 6, "refund-completed"),
  ]

  it("returns only the requested categories", () => {
    expect(
      pageTimeline(mixed, {
        limit: 10,
        categories: ["refund-completed"],
      }).items.map((item) => item.id)
    ).toEqual(["r"])
  })

  it("accepts several categories", () => {
    expect(
      pageTimeline(mixed, {
        limit: 10,
        categories: ["refund-completed", "payment-received"],
      }).items
    ).toHaveLength(mixed.length)
  })

  it("treats an empty category list as no filter", () => {
    expect(pageTimeline(mixed, { limit: 10, categories: [] }).items).toHaveLength(
      mixed.length
    )
  })

  it("pages within a filtered set without leaking other categories", () => {
    const page = pageTimeline(mixed, {
      limit: 1,
      categories: ["payment-received"],
    })
    const next = pageTimeline(mixed, {
      limit: 1,
      categories: ["payment-received"],
      cursor: page.nextCursor,
    })
    for (const item of [...page.items, ...next.items])
      expect(item.category).toBe("payment-received")
  })
})

describe("sequence allocation", () => {
  it("continues from the highest existing sequence", () => {
    expect(nextSequence(events)).toBe(5)
  })

  it("starts at one for an empty timeline", () => {
    expect(nextSequence([])).toBe(1)
  })

  it("does not depend on array order", () => {
    expect(nextSequence([...events].reverse())).toBe(5)
  })
})
