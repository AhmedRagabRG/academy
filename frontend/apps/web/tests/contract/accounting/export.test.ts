import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"
import { AccountingError } from "@/features/accounting/services/accounting-error"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const paging = { page: 1, pageSize: 100 }

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

describe("export mirrors the list it exports", () => {
  it("returns one row per listed request", async () => {
    const list = await accountingService.listRequests(paging)
    const exported = await accountingService.exportRequests(paging)
    expect(exported).toHaveLength(list.total)
  })

  it("applies the same filters", async () => {
    const query = { ...paging, statuses: ["approved" as const] }
    const list = await accountingService.listRequests(query)
    const exported = await accountingService.exportRequests(query)
    expect(exported).toHaveLength(list.total)
    expect(exported.every((row) => row.status === "approved")).toBe(true)
  })

  it("applies the same search", async () => {
    const query = { ...paging, search: "قرطاسية" }
    const list = await accountingService.listRequests(query)
    const exported = await accountingService.exportRequests(query)
    expect(exported).toHaveLength(list.total)
  })

  it("applies the same branch scope", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const list = await accountingService.listRequests(paging)
    const exported = await accountingService.exportRequests(paging)
    expect(exported).toHaveLength(list.total)
    expect(exported.every((row) => row.branchLabel === "فرع القاهرة")).toBe(true)
  })

  it("exports nothing for a user with no branches", async () => {
    accountingScenarios.scopeToBranches([])
    expect(await accountingService.exportRequests(paging)).toEqual([])
  })

  it("carries readable labels rather than raw ids", async () => {
    const exported = await accountingService.exportRequests(paging)
    const row = exported[0]!
    expect(row.branchLabel).not.toMatch(/^branch-/)
    expect(row.categoryLabel).not.toMatch(/^category-/)
    expect(row.requestNumber).toMatch(/^EXP-/)
  })

  it("carries the amount as a decimal string, never a number", async () => {
    const exported = await accountingService.exportRequests(paging)
    expect(typeof exported[0]!.amount).toBe("string")
  })

  it("uses an empty string for an absent sub-category, not undefined", async () => {
    const exported = await accountingService.exportRequests(paging)
    expect(exported.every((row) => typeof row.subCategoryLabel === "string")).toBe(true)
  })
})

describe("export requires its own permission", () => {
  it("is refused without accounting.export", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.export])
    expect(
      (await captureError(() => accountingService.exportRequests(paging))).code
    ).toBe("forbidden")
  })

  it("is not satisfied by the view permission alone", async () => {
    accountingScenarios.onlyPermissions([
      accountingPermissions.view,
      accountingPermissions.requestsView,
      accountingPermissions.categoriesView,
      accountingPermissions.historyView,
    ])
    // Reading a queue on screen and taking the data away are different acts.
    const list = await accountingService.listRequests(paging)
    expect(list.total).toBeGreaterThan(0)
    expect(
      (await captureError(() => accountingService.exportRequests(paging))).code
    ).toBe("forbidden")
  })

  it("refuses an inverted range like the list does", async () => {
    expect(
      (
        await captureError(() =>
          accountingService.exportRequests({
            ...paging,
            dateRange: { field: "requestDate", from: "2026-08-01", to: "2026-01-01" },
          })
        )
      ).code
    ).toBe("invalid-date-range")
  })
})
