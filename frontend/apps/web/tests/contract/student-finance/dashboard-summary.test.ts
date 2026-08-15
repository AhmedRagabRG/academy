import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService as service,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { defaultInvoiceListQuery } from "@/features/student-finance/utils/finance-list-query"
import { MAX_PAGE_SIZE } from "@/shared/utils/list-query"
import { add, compare, sum, zeroMoney } from "@/shared/utils/money"

/**
 * The dashboard's totals must cover every invoice in scope, not a page of them.
 *
 * The screen used to sum `listInvoices({ pageSize: 100 })` and present the result
 * as an organization-wide figure. Past the page cap that was silently wrong, with
 * nothing on screen to indicate the truncation — so these assert the summary
 * disagrees with a single page exactly when a single page is not the whole set.
 */
describe("finance dashboard summary", () => {
  beforeEach(resetFinanceStore)
  afterEach(() => financeScenarios.reset())

  it("agrees with the queue when everything fits on one page", async () => {
    const summary = await service.getDashboardSummary({})
    const page = await service.listInvoices({
      ...defaultInvoiceListQuery,
      pageSize: MAX_PAGE_SIZE,
    })
    expect(page.total).toBeLessThanOrEqual(MAX_PAGE_SIZE)

    const active = page.items.filter((row) => row.status !== "cancelled")
    const currency = summary.invoiced.currency
    const precision = summary.invoiced.precision
    const expected = sum(
      active.map((row) => row.finalAmount),
      currency,
      precision
    )
    expect(compare(summary.invoiced, expected)).toBe(0)
  })

  describe("beyond a single page", () => {
    // Comfortably past MAX_PAGE_SIZE, small enough to sum exhaustively here.
    const SIZE = 400

    beforeEach(() => financeScenarios.useScale(true, SIZE))

    it("covers every invoice, not just the first page", async () => {
      const summary = await service.getDashboardSummary({})
      const firstPage = await service.listInvoices({
        ...defaultInvoiceListQuery,
        pageSize: MAX_PAGE_SIZE,
      })

      expect(firstPage.total).toBeGreaterThan(MAX_PAGE_SIZE)
      expect(firstPage.items).toHaveLength(MAX_PAGE_SIZE)

      const pageTotal = sum(
        firstPage.items
          .filter((row) => row.status !== "cancelled")
          .map((row) => row.finalAmount),
        summary.invoiced.currency,
        summary.invoiced.precision
      )

      // The regression: the old screen would have reported `pageTotal` here.
      expect(compare(summary.invoiced, pageTotal)).toBeGreaterThan(0)
    })

    it("matches an exhaustive walk of every page", async () => {
      const summary = await service.getDashboardSummary({})
      const currency = summary.invoiced.currency
      const precision = summary.invoiced.precision

      let invoiced = zeroMoney(currency, precision)
      let collected = zeroMoney(currency, precision)
      let outstanding = zeroMoney(currency, precision)
      let unsettled = 0
      let page = 1
      let totalPages = 1

      do {
        const result = await service.listInvoices({
          ...defaultInvoiceListQuery,
          page,
          pageSize: MAX_PAGE_SIZE,
        })
        totalPages = result.totalPages
        for (const row of result.items) {
          if (row.status === "cancelled") continue
          invoiced = add(invoiced, row.finalAmount)
          collected = add(collected, row.paidAmount)
          outstanding = add(outstanding, row.remaining)
          if (row.status === "issued" || row.status === "partially-paid")
            unsettled += 1
        }
        page += 1
      } while (page <= totalPages)

      expect(compare(summary.invoiced, invoiced)).toBe(0)
      expect(compare(summary.collected, collected)).toBe(0)
      expect(compare(summary.outstanding, outstanding)).toBe(0)
      expect(summary.unsettledInvoices).toBe(unsettled)
    })
  })

  it("reports absence as a fact rather than as zeroes", async () => {
    const populated = await service.getDashboardSummary({})
    expect(populated.hasNoRecords).toBe(false)

    // A filter that matches nothing is empty, not merely zero-valued.
    const empty = await service.getDashboardSummary({
      studentIds: ["student-does-not-exist"],
    })
    expect(empty.hasNoRecords).toBe(true)
    expect(empty.unsettledInvoices).toBe(0)
  })

  it("honours the same filters as the queue", async () => {
    const all = await service.getDashboardSummary({})
    const draftsOnly = await service.getDashboardSummary({ statuses: ["draft"] })

    expect(compare(draftsOnly.invoiced, all.invoiced)).toBeLessThanOrEqual(0)
    expect(draftsOnly.unsettledInvoices).toBe(0)
  })

  it("refuses an inverted date range", async () => {
    await expect(
      service.getDashboardSummary({
        dateRange: { field: "dueDate", from: "2026-12-31", to: "2026-01-01" },
      })
    ).rejects.toMatchObject({ code: "invalid-date-range" })
  })

  it("carries an asOf stamp", async () => {
    const summary = await service.getDashboardSummary({})
    expect(Number.isNaN(new Date(summary.asOf).getTime())).toBe(false)
  })
})
