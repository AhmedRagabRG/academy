import { beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"

beforeEach(() => resetAccountingStore())

const paging = { page: 1, pageSize: 1000 }

describe("the monthly total", () => {
  it("sums exactly the requests dated in that month", async () => {
    const dashboard = await accountingService.getDashboard({ month: "2026-07" })
    const july = await accountingService.listRequests({
      ...paging,
      dateRange: { field: "requestDate", from: "2026-07-01", to: "2026-07-31" },
    })
    const expected = july.items.reduce(
      (total, item) => total + Number(item.amount.amount),
      0
    )
    expect(Number(dashboard.monthlyTotal.amount)).toBeCloseTo(expected, 2)
  })

  it("differs between months, so it is genuinely scoped to one", async () => {
    const july = await accountingService.getDashboard({ month: "2026-07" })
    const june = await accountingService.getDashboard({ month: "2026-06" })
    expect(july.monthlyTotal.amount).not.toBe(june.monthlyTotal.amount)
  })

  it("is zero for a month with no requests", async () => {
    const dashboard = await accountingService.getDashboard({ month: "2020-01" })
    expect(Number(dashboard.monthlyTotal.amount)).toBe(0)
  })

  it("defaults to the injected clock's month rather than the real one", async () => {
    // Determinism: the fixed clock is 2026-08.
    const defaulted = await accountingService.getDashboard({})
    const explicit = await accountingService.getDashboard({ month: "2026-08" })
    expect(defaulted.monthlyTotal.amount).toBe(explicit.monthlyTotal.amount)
  })
})

describe("money is exact throughout", () => {
  it("carries totals as decimal strings, never numbers", async () => {
    const dashboard = await accountingService.getDashboard({})
    expect(typeof dashboard.monthlyTotal.amount).toBe("string")
    for (const row of dashboard.byBranch) expect(typeof row.total.amount).toBe("string")
  })

  it("carries the configured currency and precision", async () => {
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.monthlyTotal.currency).toBe("EGP")
    expect(dashboard.monthlyTotal.precision).toBe(2)
  })

  it("sums a fractional amount without drift", async () => {
    // A seeded request is 1250.50; float addition would show its fingerprint here.
    const dashboard = await accountingService.getDashboard({})
    const total = dashboard.byBranch.reduce(
      (running, row) => running + Number(row.total.amount),
      0
    )
    const all = await accountingService.listRequests(paging)
    const expected = all.items.reduce(
      (running, item) => running + Number(item.amount.amount),
      0
    )
    expect(total).toBeCloseTo(expected, 2)
  })

  it("keeps every total at the configured precision", async () => {
    const dashboard = await accountingService.getDashboard({})
    for (const row of [...dashboard.byBranch, ...dashboard.byCategory])
      expect(row.total.amount).toMatch(/^\d+\.\d{2}$/)
  })
})

describe("the as-of time", () => {
  it("comes from the injected clock", async () => {
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.asOf).toBe("2026-08-01T12:00:00.000Z")
  })
})
