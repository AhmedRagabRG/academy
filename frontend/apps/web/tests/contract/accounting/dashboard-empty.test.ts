import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

/**
 * FR-045. A zero that means "nothing exists" and a zero that means "nothing
 * matched" are different facts, and a dashboard showing bare zeroes implies the
 * organization spent nothing rather than that it has recorded nothing.
 */
describe("no records is a fact, not a set of zeroes", () => {
  it("reports hasNoRecords when the scope holds nothing", async () => {
    accountingScenarios.scopeToBranches([])
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.hasNoRecords).toBe(true)
  })

  it("reports hasNoRecords false when records exist", async () => {
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.hasNoRecords).toBe(false)
  })

  it("does not report hasNoRecords merely because a month is empty", async () => {
    // The month has no expenses; the organization still has records.
    const dashboard = await accountingService.getDashboard({ month: "2020-01" })
    expect(dashboard.hasNoRecords).toBe(false)
    expect(Number(dashboard.monthlyTotal.amount)).toBe(0)
  })

  it("still reports a coherent shape when empty", async () => {
    accountingScenarios.scopeToBranches([])
    const dashboard = await accountingService.getDashboard({})
    expect(Number(dashboard.monthlyTotal.amount)).toBe(0)
    expect(dashboard.byCategory).toEqual([])
    expect(dashboard.asOf).toBeTruthy()
  })
})
