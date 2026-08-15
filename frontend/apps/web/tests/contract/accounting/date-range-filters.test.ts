import { beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { AccountingError } from "@/features/accounting/services/accounting-error"

beforeEach(() => resetAccountingStore())

const paging = { page: 1, pageSize: 100 }
const list = (query = {}) => accountingService.listRequests({ ...paging, ...query })
const range = (from?: string, to?: string) =>
  ({ field: "requestDate" as const, from, to })

/**
 * A date-only bound names a **day**, not the instant of its midnight. The seeded
 * requests are recorded at 09:00, so a `to` of that same date would exclude them
 * under a naive comparison — the off-by-one that silently drops the last day of
 * every range.
 */
describe("date ranges include both edges", () => {
  it("includes a request recorded during the day named by the upper bound", async () => {
    // The seeded draft is 2026-07-20T09:00.
    const page = await list({ dateRange: range(undefined, "2026-07-20") })
    expect(page.items.some((item) => item.requestDate.startsWith("2026-07-20"))).toBe(
      true
    )
  })

  it("includes a request recorded on the day named by the lower bound", async () => {
    const page = await list({ dateRange: range("2026-07-20", undefined) })
    expect(page.items.some((item) => item.requestDate.startsWith("2026-07-20"))).toBe(
      true
    )
  })

  it("matches a single-day range against a request recorded at any time that day", async () => {
    const page = await list({ dateRange: range("2026-07-20", "2026-07-20") })
    expect(page.total).toBeGreaterThan(0)
    expect(page.items.every((item) => item.requestDate.startsWith("2026-07-20"))).toBe(
      true
    )
  })

  it("excludes the day after the upper bound", async () => {
    const page = await list({ dateRange: range(undefined, "2026-07-19") })
    expect(page.items.some((item) => item.requestDate.startsWith("2026-07-20"))).toBe(
      false
    )
  })

  it("excludes the day before the lower bound", async () => {
    const page = await list({ dateRange: range("2026-07-21", undefined) })
    expect(page.items.some((item) => item.requestDate.startsWith("2026-07-20"))).toBe(
      false
    )
  })

  it("treats a missing bound as open-ended", async () => {
    const all = await list()
    const openEnded = await list({ dateRange: range("2020-01-01", undefined) })
    expect(openEnded.total).toBe(all.total)
  })

  it("narrows to a month correctly", async () => {
    const july = await list({ dateRange: range("2026-07-01", "2026-07-31") })
    expect(july.total).toBeGreaterThan(0)
    expect(july.items.every((item) => item.requestDate.startsWith("2026-07"))).toBe(true)
  })
})

describe("an inverted range is refused, not silently empty", () => {
  it("throws rather than returning zero rows", async () => {
    // Returning nothing would look like "no matches" and hide the mistake.
    await expect(
      list({ dateRange: range("2026-08-01", "2026-01-01") })
    ).rejects.toBeInstanceOf(AccountingError)
  })

  it("reports the invalid-date-range code", async () => {
    try {
      await list({ dateRange: range("2026-08-01", "2026-01-01") })
      throw new Error("expected a refusal")
    } catch (error) {
      expect((error as AccountingError).code).toBe("invalid-date-range")
    }
  })

  it("accepts a range whose bounds are equal", async () => {
    await expect(
      list({ dateRange: range("2026-07-20", "2026-07-20") })
    ).resolves.toBeDefined()
  })

  it("does not refuse a range with only one bound", async () => {
    await expect(list({ dateRange: range("2026-08-01") })).resolves.toBeDefined()
    await expect(list({ dateRange: range(undefined, "2026-01-01") })).resolves.toBeDefined()
  })
})

describe("the range composes with other filters", () => {
  it("applies both the range and the status", async () => {
    const page = await list({
      dateRange: range("2026-06-01", "2026-07-31"),
      statuses: ["paid"],
    })
    expect(page.items.every((item) => item.status === "paid")).toBe(true)
    expect(
      page.items.every(
        (item) =>
          item.requestDate >= "2026-06-01" && item.requestDate <= "2026-08-01"
      )
    ).toBe(true)
  })

  it("can narrow to nothing without erroring", async () => {
    const page = await list({
      dateRange: range("2026-01-01", "2026-01-02"),
      statuses: ["paid"],
    })
    expect(page.total).toBe(0)
  })
})
