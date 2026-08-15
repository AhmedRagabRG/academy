import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const paging = { page: 1, pageSize: 1000 }

describe("the dashboard narrows with scope exactly as the lists do", () => {
  it("counts only in-scope requests", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const dashboard = await accountingService.getDashboard({})
    const list = await accountingService.listRequests(paging)

    const total =
      dashboard.byBranch.reduce((running, row) => running + row.count, 0)
    expect(total).toBe(list.total)
  })

  it("shows only the branches the user may see", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.byBranch.every((row) => row.key === "branch-cairo")).toBe(true)
  })

  it("reports smaller figures than an organization-wide user sees", async () => {
    const wide = await accountingService.getDashboard({})
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const scoped = await accountingService.getDashboard({})

    const sumCounts = (dashboard: typeof wide) =>
      dashboard.byBranch.reduce((running, row) => running + row.count, 0)
    expect(sumCounts(scoped)).toBeLessThan(sumCounts(wide))
  })

  it("reports zero everything for a user with no branches", async () => {
    accountingScenarios.scopeToBranches([])
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.counts).toEqual({
      pending: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
    })
    expect(dashboard.byBranch).toEqual([])
    expect(dashboard.recent).toEqual([])
  })

  it("cannot be widened by asking for another branch", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const dashboard = await accountingService.getDashboard({
      branchIds: ["branch-giza"],
    })
    expect(dashboard.byBranch).toEqual([])
  })
})

describe("reading the dashboard requires its own permission", () => {
  it("is refused without accounting.dashboard.view", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.dashboardView])
    await expect(accountingService.getDashboard({})).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("reports the acting user's permissions, so quick actions can be gated", async () => {
    accountingScenarios.onlyPermissions([
      accountingPermissions.view,
      accountingPermissions.dashboardView,
      accountingPermissions.requestsView,
    ])
    const dashboard = await accountingService.getDashboard({})
    expect(dashboard.permissions.requestsCreate).toBe(false)
    expect(dashboard.permissions.requestsView).toBe(true)
  })
})
