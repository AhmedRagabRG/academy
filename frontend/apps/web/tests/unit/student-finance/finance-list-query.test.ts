import { describe, expect, it } from "vitest"
import {
  clampPage,
  defaultInvoiceListQuery,
  hasActiveFilters,
  isInvertedRange,
  isWithinRange,
  normalizeArabic,
  normalizeDigits,
  normalizeInvoiceListQuery,
  normalizePaymentListQuery,
  normalizeSearchTerm,
  serializeQuery,
} from "@/features/student-finance/utils/finance-list-query"
import {
  intakeIdempotencyKey,
  partitionPurposes,
} from "@/features/student-finance/utils/finance-intake-rules"
import {
  decodeCursor,
  encodeCursor,
  nextSequence,
  pageTimeline,
  sortTimeline,
} from "@/features/student-finance/utils/finance-timeline"
import type { FinanceTimelineEvent } from "@/features/student-finance/types/domain"
import type { FinanceEventId } from "@/features/student-finance/types/common"

describe("search normalization", () => {
  it("folds Arabic-Indic digits so invoice numbers match", () => {
    expect(normalizeDigits("٢٠٢٦")).toBe("2026")
  })

  it("folds Arabic letter variants", () => {
    expect(normalizeArabic("أحمد")).toBe(normalizeArabic("احمد"))
  })

  it("collapses whitespace and lowercases", () => {
    expect(normalizeSearchTerm("  INV-2026   00001 ")).toBe("inv-2026 00001")
  })
})

describe("date ranges", () => {
  it("detects an inverted range", () => {
    expect(
      isInvertedRange({ field: "dueDate", from: "2026-06-01", to: "2026-01-01" })
    ).toBe(true)
  })

  it("does not treat an open-ended range as inverted", () => {
    expect(isInvertedRange({ field: "dueDate", from: "2026-06-01" })).toBe(false)
    expect(isInvertedRange({ field: "dueDate", to: "2026-06-01" })).toBe(false)
    expect(isInvertedRange(undefined)).toBe(false)
  })

  it("is inclusive on both bounds", () => {
    const range = {
      field: "dueDate" as const,
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T00:00:00.000Z",
    }
    expect(isWithinRange("2026-03-01T00:00:00.000Z", range)).toBe(true)
    expect(isWithinRange("2026-03-31T00:00:00.000Z", range)).toBe(true)
    expect(isWithinRange("2026-02-28T23:59:59.999Z", range)).toBe(false)
    expect(isWithinRange("2026-04-01T00:00:00.000Z", range)).toBe(false)
  })

  it("treats a missing bound as open-ended", () => {
    expect(
      isWithinRange("2030-01-01T00:00:00.000Z", { field: "dueDate", from: "2026-01-01T00:00:00.000Z" })
    ).toBe(true)
  })

  it("admits everything when no range is set", () => {
    expect(isWithinRange("2026-03-01T00:00:00.000Z")).toBe(true)
  })
})

describe("query normalization", () => {
  it("dedupes and sorts filters so equivalent queries share a cache key", () => {
    const left = normalizeInvoiceListQuery({
      ...defaultInvoiceListQuery,
      branchIds: ["b", "a", "b"],
    })
    const right = normalizeInvoiceListQuery({
      ...defaultInvoiceListQuery,
      branchIds: ["a", "b"],
    })
    expect(left.branchIds).toEqual(["a", "b"])
    expect(serializeQuery(left)).toBe(serializeQuery(right))
  })

  it("drops empty filters rather than storing empty arrays", () => {
    const normalized = normalizeInvoiceListQuery({
      ...defaultInvoiceListQuery,
      branchIds: [],
      search: "   ",
    })
    expect(normalized.branchIds).toBeUndefined()
    expect(normalized.search).toBeUndefined()
  })

  it("drops a range with no bounds", () => {
    expect(
      normalizeInvoiceListQuery({
        ...defaultInvoiceListQuery,
        dateRange: { field: "dueDate" },
      }).dateRange
    ).toBeUndefined()
  })

  it("clamps page and page size", () => {
    const normalized = normalizeInvoiceListQuery({ page: -3, pageSize: 5000 })
    expect(normalized.page).toBe(1)
    expect(normalized.pageSize).toBe(100)
  })

  it("normalizes the payment query the same way", () => {
    const normalized = normalizePaymentListQuery({
      page: 1,
      pageSize: 20,
      methodIds: ["cash", "cash", "bank"],
    })
    expect(normalized.methodIds).toEqual(["bank", "cash"])
  })
})

describe("page clamping", () => {
  it("clamps into range instead of resetting to one", () => {
    expect(clampPage(9, 20, 45)).toBe(3)
  })

  it("never goes below one", () => {
    expect(clampPage(4, 20, 0)).toBe(1)
  })
})

describe("active filters", () => {
  it("detects any active filter", () => {
    expect(hasActiveFilters(defaultInvoiceListQuery)).toBe(false)
    expect(hasActiveFilters({ statuses: ["issued"] })).toBe(true)
    expect(hasActiveFilters({ dateRange: { field: "dueDate", from: "2026-01-01" } })).toBe(true)
  })
})

describe("invoicing idempotency", () => {
  it("derives a key from enrollment and purpose", () => {
    expect(intakeIdempotencyKey("enrollment-1", "tuition")).toBe(
      "enrollment:enrollment-1:purpose:tuition"
    )
  })

  it("distinguishes purposes on the same enrollment", () => {
    expect(intakeIdempotencyKey("enrollment-1", "tuition")).not.toBe(
      intakeIdempotencyKey("enrollment-1", "registration-fee")
    )
  })

  it("splits requested purposes into existing and missing", () => {
    const index = new Map([["enrollment:e1:purpose:tuition", {}]])
    expect(partitionPurposes("e1", ["tuition", "registration-fee"], index)).toEqual({
      existing: ["tuition"],
      missing: ["registration-fee"],
    })
  })
})

describe("timeline paging", () => {
  const event = (id: string, occurredAt: string, sequence: number): FinanceTimelineEvent =>
    ({
      id: id as FinanceEventId,
      studentId: "student-1",
      category: "payment-received",
      occurredAt,
      sequence,
      actor: { id: "u", name: "م", active: true },
      summary: id,
    }) as FinanceTimelineEvent

  const events = [
    event("a", "2026-01-01T00:00:00.000Z", 1),
    event("b", "2026-03-01T00:00:00.000Z", 2),
    event("c", "2026-03-01T00:00:00.000Z", 3),
    event("d", "2026-06-01T00:00:00.000Z", 4),
  ]

  it("sorts newest first with a sequence tiebreak", () => {
    expect(sortTimeline(events).map((e) => e.id)).toEqual(["d", "c", "b", "a"])
  })

  it("round-trips a cursor", () => {
    expect(decodeCursor(encodeCursor(events[1]!))).toEqual({
      occurredAt: "2026-03-01T00:00:00.000Z",
      sequence: 2,
    })
    expect(decodeCursor("garbage")).toBeUndefined()
  })

  it("pages without repeating or skipping", () => {
    const first = pageTimeline(events, { limit: 2 })
    expect(first.items.map((e) => e.id)).toEqual(["d", "c"])
    const second = pageTimeline(events, { limit: 2, cursor: first.nextCursor })
    expect(second.items.map((e) => e.id)).toEqual(["b", "a"])
    expect(second.nextCursor).toBeUndefined()
  })

  it("stays stable when a newer event is appended mid-paging", () => {
    const first = pageTimeline(events, { limit: 2 })
    const withNewer = [...events, event("e", "2026-09-01T00:00:00.000Z", 5)]
    const second = pageTimeline(withNewer, { limit: 2, cursor: first.nextCursor })
    expect(second.items.map((e) => e.id)).toEqual(["b", "a"])
  })

  it("filters by category", () => {
    const mixed = [...events, { ...event("x", "2026-07-01T00:00:00.000Z", 6), category: "refund-completed" as const }]
    expect(
      pageTimeline(mixed, { limit: 10, categories: ["refund-completed"] }).items.map((e) => e.id)
    ).toEqual(["x"])
  })

  it("allocates the next sequence", () => {
    expect(nextSequence(events)).toBe(5)
    expect(nextSequence([])).toBe(1)
  })
})

/**
 * A date-only bound names a day, not its midnight. Getting this wrong drops rows
 * from the far edge of every queue filter.
 */
describe("date-only bounds cover the whole day", () => {
  const at = (value: string) => value

  it("includes an instant later on the to date", () => {
    expect(
      isWithinRange(at("2026-01-15T09:00:00.000Z"), {
        field: "issueDate",
        from: "2026-01-01",
        to: "2026-01-15",
      })
    ).toBe(true)
  })

  it("includes the last millisecond of the to date", () => {
    expect(
      isWithinRange(at("2026-01-15T23:59:59.999Z"), { field: "issueDate", to: "2026-01-15" })
    ).toBe(true)
  })

  it("excludes the first instant of the next day", () => {
    expect(isWithinRange(at("2026-01-16T00:00:00.000Z"), { field: "issueDate", to: "2026-01-15" })).toBe(
      false
    )
  })

  it("includes the very start of the from date", () => {
    expect(
      isWithinRange(at("2026-01-15T00:00:00.000Z"), { field: "issueDate", from: "2026-01-15" })
    ).toBe(true)
  })

  it("excludes the instant before the from date", () => {
    expect(
      isWithinRange(at("2026-01-14T23:59:59.999Z"), { field: "issueDate", from: "2026-01-15" })
    ).toBe(false)
  })

  it("matches a single-day range against any time that day", () => {
    for (const time of ["00:00:00.000Z", "09:00:00.000Z", "23:59:59.999Z"])
      expect(
        isWithinRange(`2026-01-15T${time}`, { field: "issueDate", from: "2026-01-15", to: "2026-01-15" }),
        time
      ).toBe(true)
  })

  it("treats a full timestamp bound as that exact instant", () => {
    // An explicit timestamp is a precise instant, not a day.
    expect(
      isWithinRange("2026-01-15T09:00:00.001Z", { field: "issueDate", to: "2026-01-15T09:00:00.000Z" })
    ).toBe(false)
  })
})
