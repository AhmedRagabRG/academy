import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { FinanceError } from "@/features/student-finance/services/finance-error"

beforeEach(() => resetFinanceStore())

const paging = { page: 1, pageSize: 200 }

/** The seeded issue date of the earliest invoice. */
const FIRST_ISSUE = "2026-01-15T09:00:00.000Z"
const day = (value: string) => value.slice(0, 10)

const byIssueDate = (from: string, to: string) =>
  studentFinanceService.listInvoices({
    ...paging,
    dateRange: { from, to, field: "issueDate" },
  })

const byDueDate = (from: string, to: string) =>
  studentFinanceService.listInvoices({
    ...paging,
    dateRange: { from, to, field: "dueDate" },
  })

async function captureError(run: () => Promise<unknown>): Promise<FinanceError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof FinanceError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

/**
 * A finance user filtering "from the 15th to the 15th" means that day, inclusive.
 * An off-by-one at either edge silently drops real invoices from a queue, which is
 * the kind of error nobody notices until a reconciliation fails.
 */
describe("date ranges include both edges", () => {
  it("includes an invoice issued exactly on the from date", async () => {
    const page = await byIssueDate(day(FIRST_ISSUE), "2026-12-31")
    expect(
      page.items.some((item) => item.issueDate?.startsWith(day(FIRST_ISSUE)))
    ).toBe(true)
  })

  it("includes an invoice issued exactly on the to date", async () => {
    const page = await byIssueDate("2026-01-01", day(FIRST_ISSUE))
    expect(
      page.items.some((item) => item.issueDate?.startsWith(day(FIRST_ISSUE)))
    ).toBe(true)
  })

  it("finds an invoice on a single-day range covering only its issue date", async () => {
    const page = await byIssueDate(day(FIRST_ISSUE), day(FIRST_ISSUE))
    expect(page.items.length).toBeGreaterThan(0)
    for (const item of page.items)
      expect(item.issueDate?.startsWith(day(FIRST_ISSUE))).toBe(true)
  })

  it("excludes the day before and the day after", async () => {
    const before = await byIssueDate("2026-01-14", "2026-01-14")
    const after = await byIssueDate("2026-01-16", "2026-01-16")
    for (const page of [before, after])
      expect(
        page.items.some((item) => item.issueDate?.startsWith(day(FIRST_ISSUE)))
      ).toBe(false)
  })

  it("applies the same inclusivity to the due-date field", async () => {
    const all = await studentFinanceService.listInvoices(paging)
    const target = all.items[0]!
    const page = await byDueDate(day(target.dueDate), day(target.dueDate))
    expect(page.items.some((item) => item.id === target.id)).toBe(true)
  })
})

describe("the chosen field is the field that filters", () => {
  it("filters on issue date without consulting the due date", async () => {
    const page = await byIssueDate("2026-01-01", "2026-01-31")
    for (const item of page.items) {
      expect(item.issueDate).toBeTruthy()
      expect(item.issueDate! >= "2026-01-01").toBe(true)
      expect(item.issueDate! <= "2026-02-01").toBe(true)
    }
  })

  it("returns a different set for the two fields", async () => {
    const issued = await byIssueDate("2026-01-01", "2026-03-01")
    const due = await byDueDate("2026-01-01", "2026-03-01")
    expect(issued.items.map((item) => item.id)).not.toEqual(
      due.items.map((item) => item.id)
    )
  })

  it("excludes drafts from an issue-date filter, since they have no issue date", async () => {
    const page = await byIssueDate("2020-01-01", "2030-12-31")
    expect(page.items.some((item) => item.status === "draft")).toBe(false)
  })
})

describe("an inverted range is refused rather than silently empty", () => {
  it("refuses from-after-to on the invoices queue", async () => {
    const error = await captureError(() => byIssueDate("2026-06-01", "2026-01-01"))
    expect(error.code).toBe("invalid-date-range")
  })

  it("refuses it on the payments queue", async () => {
    const error = await captureError(() =>
      studentFinanceService.listPayments({
        ...paging,
        dateRange: { from: "2026-06-01", to: "2026-01-01", field: "paymentDate" },
      })
    )
    expect(error.code).toBe("invalid-date-range")
  })

  it("refuses it on the installments queue", async () => {
    const error = await captureError(() =>
      studentFinanceService.listInstallments({
        ...paging,
        dateRange: { from: "2026-06-01", to: "2026-01-01", field: "dueDate" },
      })
    )
    expect(error.code).toBe("invalid-date-range")
  })

  it("refuses it on the refunds queue", async () => {
    const error = await captureError(() =>
      studentFinanceService.listRefunds({
        ...paging,
        dateRange: { from: "2026-06-01", to: "2026-01-01", field: "refundDate" },
      })
    )
    expect(error.code).toBe("invalid-date-range")
  })

  it("accepts an equal from and to", async () => {
    await expect(
      byIssueDate(day(FIRST_ISSUE), day(FIRST_ISSUE))
    ).resolves.toBeDefined()
  })
})

describe("date filters compose with the rest of the query", () => {
  it("narrows further when combined with a status filter", async () => {
    const dated = await byIssueDate("2026-01-01", "2026-12-31")
    const both = await studentFinanceService.listInvoices({
      ...paging,
      statuses: ["paid"],
      dateRange: { from: "2026-01-01", to: "2026-12-31", field: "issueDate" },
    })
    expect(both.total).toBeLessThanOrEqual(dated.total)
    for (const item of both.items) expect(item.status).toBe("paid")
  })

  it("narrows further when combined with a search term", async () => {
    const dated = await byIssueDate("2020-01-01", "2030-12-31")
    const target = dated.items[0]!
    const both = await studentFinanceService.listInvoices({
      ...paging,
      search: target.studentCode,
      dateRange: { from: "2020-01-01", to: "2030-12-31", field: "issueDate" },
    })
    expect(both.total).toBeLessThanOrEqual(dated.total)
    expect(both.items.some((item) => item.id === target.id)).toBe(true)
  })
})
