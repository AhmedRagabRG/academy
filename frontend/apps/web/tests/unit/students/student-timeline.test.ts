import { describe, expect, it } from "vitest"
import {
  compareEvents,
  decodeCursor,
  encodeCursor,
  mergeTimeline,
  nextSequence,
  pageTimeline,
  sortTimeline,
} from "@/features/students/utils/student-timeline"
import type { StudentTimelineEvent } from "@/features/students/types/domain"
import type {
  StudentId,
  StudentTimelineEventId,
} from "@/features/students/types/common"

const event = (
  id: string,
  occurredAt: string,
  sequence: number,
  category: StudentTimelineEvent["category"] = "profile-updated"
): StudentTimelineEvent => ({
  id: id as StudentTimelineEventId,
  studentId: "student-1" as StudentId,
  category,
  occurredAt,
  sequence,
  actor: { id: "e1", name: "موظف", active: true },
  origin: "students",
  summary: `حدث ${id}`,
})

const events = [
  event("a", "2026-01-01T00:00:00.000Z", 1),
  event("b", "2026-03-01T00:00:00.000Z", 2),
  event("c", "2026-03-01T00:00:00.000Z", 3),
  event("d", "2026-06-01T00:00:00.000Z", 4),
]

describe("ordering", () => {
  it("sorts newest first", () => {
    expect(sortTimeline(events).map((e) => e.id)).toEqual(["d", "c", "b", "a"])
  })

  it("breaks ties on identical timestamps by sequence", () => {
    expect(compareEvents(event("x", "2026-03-01T00:00:00.000Z", 2), event("y", "2026-03-01T00:00:00.000Z", 3))).toBeGreaterThan(0)
  })

  it("is stable regardless of input order", () => {
    const shuffled = [events[2]!, events[0]!, events[3]!, events[1]!]
    expect(sortTimeline(shuffled).map((e) => e.id)).toEqual(
      sortTimeline(events).map((e) => e.id)
    )
  })
})

describe("merging", () => {
  it("merges sources and drops duplicates by id", () => {
    const merged = mergeTimeline(
      [events[0]!, events[1]!],
      [events[1]!, events[3]!]
    )
    expect(merged.map((e) => e.id)).toEqual(["d", "b", "a"])
  })

  it("returns an empty list for no sources", () => {
    expect(mergeTimeline()).toEqual([])
  })
})

describe("cursor encoding", () => {
  it("round-trips a position", () => {
    const cursor = encodeCursor(events[1]!)
    expect(decodeCursor(cursor)).toEqual({
      occurredAt: "2026-03-01T00:00:00.000Z",
      sequence: 2,
    })
  })

  it("rejects a malformed cursor", () => {
    expect(decodeCursor("garbage")).toBeUndefined()
    expect(decodeCursor("2026-01-01|abc")).toBeUndefined()
  })
})

describe("paging", () => {
  it("returns the first page with a cursor when more remain", () => {
    const page = pageTimeline(events, { limit: 2 })
    expect(page.items.map((e) => e.id)).toEqual(["d", "c"])
    expect(page.nextCursor).toBeTruthy()
  })

  it("continues from the cursor without repeating or skipping", () => {
    const first = pageTimeline(events, { limit: 2 })
    const second = pageTimeline(events, { limit: 2, cursor: first.nextCursor })

    expect(second.items.map((e) => e.id)).toEqual(["b", "a"])
    const seen = [...first.items, ...second.items].map((e) => e.id)
    expect(new Set(seen).size).toBe(seen.length)
    expect(seen).toHaveLength(events.length)
  })

  it("omits the cursor on the final page", () => {
    const last = pageTimeline(events, { limit: 10 })
    expect(last.nextCursor).toBeUndefined()
  })

  it("keeps ordering stable when a newer event is appended mid-paging", () => {
    const first = pageTimeline(events, { limit: 2 })
    const withNewer = [...events, event("e", "2026-09-01T00:00:00.000Z", 5)]

    // The keyset cursor anchors to a position, so the second page is unaffected
    // by an event inserted above it — offset paging would have shifted rows.
    const second = pageTimeline(withNewer, {
      limit: 2,
      cursor: first.nextCursor,
    })
    expect(second.items.map((e) => e.id)).toEqual(["b", "a"])
  })

  it("filters by category", () => {
    const mixed = [
      ...events,
      event("s", "2026-07-01T00:00:00.000Z", 6, "status-changed"),
    ]
    const page = pageTimeline(mixed, {
      limit: 10,
      categories: ["status-changed"],
    })
    expect(page.items.map((e) => e.id)).toEqual(["s"])
  })

  it("clamps an unreasonable page size", () => {
    expect(pageTimeline(events, { limit: 9999 }).items).toHaveLength(4)
    expect(pageTimeline(events, { limit: 0 }).items).toHaveLength(1)
  })
})

describe("sequence allocation", () => {
  it("returns one above the highest existing sequence", () => {
    expect(nextSequence(events)).toBe(5)
  })

  it("starts at one for a student with no events", () => {
    expect(nextSequence([])).toBe(1)
  })
})
