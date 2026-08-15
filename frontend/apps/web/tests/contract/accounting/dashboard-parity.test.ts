import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import type { ExpenseStatus } from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const paging = { page: 1, pageSize: 1000 }
const countOf = async (statuses: ExpenseStatus[]) =>
  (await accountingService.listRequests({ ...paging, statuses })).total

/**
 * SC-005. Both surfaces derive from the same records, so a mismatch could only
 * come from two code paths — which is exactly what `getDashboard` avoids by
 * calling the same filter-and-count path the lists use.
 */
describe("every dashboard count equals the equivalent filtered list", () => {
  it("matches the approved count", async () => {
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.counts.approved).toBe(await countOf(["approved"]))
  })

  it("matches the rejected count", async () => {
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.counts.rejected).toBe(await countOf(["rejected"]))
  })

  it("matches the paid count", async () => {
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.counts.paid).toBe(await countOf(["paid"]))
  })

  it("counts everything still moving through the workflow as pending", async () => {
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.counts.pending).toBe(
      await countOf(["submitted", "under-review", "returned-for-revision"])
    )
  })

  it("keeps matching after a request moves between states", async () => {
    const draft = await accountingService.getRequest(
      "request-1" as Parameters<typeof accountingService.getRequest>[0]
    )
    await accountingService.submitRequest({
      requestId: draft.id,
      expectedVersion: draft.version,
    })

    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.counts.pending).toBe(
      await countOf(["submitted", "under-review", "returned-for-revision"])
    )
    expect(dashboard.counts.approved).toBe(await countOf(["approved"]))
  })

  it("keeps matching after an approval and a payment", async () => {
    const reviewing = await accountingService.getRequest(
      "request-3" as Parameters<typeof accountingService.getRequest>[0]
    )
    const approved = await accountingService.decideRequest({
      requestId: reviewing.id,
      decision: "approved",
      expectedVersion: reviewing.version,
    })
    await accountingService.markPaid({
      requestId: approved.id,
      expectedVersion: approved.version,
    })

    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.counts.paid).toBe(await countOf(["paid"]))
    expect(dashboard.counts.approved).toBe(await countOf(["approved"]))
  })

  it("never double-counts a request across the four buckets", async () => {
    const dashboard = await accountingService.getDashboard({})
    const { pending, approved, rejected, paid } = dashboard.counts
    const all = await accountingService.listRequests(paging)
    const drafted = await countOf(["draft"])
    const cancelled = await countOf(["cancelled"])
    // The four buckets plus draft and cancelled account for every request.
    expect(pending + approved + rejected + paid + drafted + cancelled).toBe(all.total)
  })
})

describe("the breakdowns agree with the lists too", () => {
  it("gives each branch the count its filtered list reports", async () => {
    const dashboard = await accountingService.getDashboard({})
    for (const row of dashboard.byBranch) {
      const list = await accountingService.listRequests({
        ...paging,
        branchIds: [row.key],
      })
      expect(row.count, row.label).toBe(list.total)
    }
  })

  it("sums each branch to what its filtered list sums", async () => {
    const dashboard = await accountingService.getDashboard({})
    for (const row of dashboard.byBranch) {
      const list = await accountingService.listRequests({
        ...paging,
        branchIds: [row.key],
      })
      const expected = list.items.reduce(
        (total, item) => total + Number(item.amount.amount),
        0
      )
      expect(Number(row.total.amount), row.label).toBeCloseTo(expected, 2)
    }
  })

  it("covers every request across the branch breakdown", async () => {
    const dashboard = await accountingService.getDashboard({})
    const all = await accountingService.listRequests(paging)
    expect(dashboard.byBranch.reduce((total, row) => total + row.count, 0)).toBe(
      all.total
    )
  })

  it("covers every request across the category breakdown", async () => {
    const dashboard = await accountingService.getDashboard({})
    const all = await accountingService.listRequests(paging)
    expect(dashboard.byCategory.reduce((total, row) => total + row.count, 0)).toBe(
      all.total
    )
  })

  it("orders breakdowns by total, largest first", async () => {
    const dashboard = await accountingService.getDashboard({})
    const totals = dashboard.byBranch.map((row) => Number(row.total.amount))
    for (let index = 1; index < totals.length; index += 1)
      expect(totals[index - 1]!).toBeGreaterThanOrEqual(totals[index]!)
  })
})

describe("recent requests", () => {
  it("returns the newest first", async () => {
    const dashboard = await accountingService.getDashboard({})
    const dates = dashboard.recent.map((item) => item.requestDate)
    for (let index = 1; index < dates.length; index += 1)
      expect(dates[index - 1]!.localeCompare(dates[index]!)).toBeGreaterThanOrEqual(0)
  })

  it("returns at most five", async () => {
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.recent.length).toBeLessThanOrEqual(5)
  })

  it("returns only rows the equivalent list would return", async () => {
    const dashboard = await accountingService.getDashboard({})
    const all = await accountingService.listRequests(paging)
    const ids = new Set(all.items.map((item) => item.id))
    expect(dashboard.recent.every((item) => ids.has(item.id))).toBe(true)
  })
})
