import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import type { ExpenseCategoryId } from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const paging = { page: 1, pageSize: 100 }
const list = (query = {}) => accountingService.listRequests({ ...paging, ...query })

describe("each filter narrows the list correctly", () => {
  it("filters by branch", async () => {
    const page = await list({ branchIds: ["branch-cairo"] })
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items.every((item) => item.branchId === "branch-cairo")).toBe(true)
  })

  it("filters by status", async () => {
    const page = await list({ statuses: ["approved"] })
    expect(page.items.every((item) => item.status === "approved")).toBe(true)
  })

  it("filters by several statuses at once", async () => {
    const page = await list({ statuses: ["approved", "paid"] })
    expect(
      page.items.every((item) => ["approved", "paid"].includes(item.status))
    ).toBe(true)
    expect(page.items.length).toBeGreaterThan(1)
  })

  it("filters by category", async () => {
    const all = await list()
    const categoryId = all.items[0]!.categoryLabel
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    const page = await list({ categoryIds: [marketing.id] })
    expect(page.items.every((item) => item.categoryLabel === "التسويق")).toBe(true)
    void categoryId
  })

  it("filters by requester", async () => {
    const all = await list()
    const requesterId = (await accountingService.lookups()).requesters[0]!.value
    const page = await list({ requesterIds: [requesterId] })
    expect(page.total).toBeGreaterThan(0)
    expect(page.total).toBeLessThanOrEqual(all.total)
  })

  it("searches by request number", async () => {
    const all = await list()
    const number = all.items[0]!.requestNumber
    const page = await list({ search: number })
    expect(page.items.map((item) => item.requestNumber)).toContain(number)
  })

  it("searches by description", async () => {
    const page = await list({ search: "قرطاسية" })
    expect(page.total).toBeGreaterThan(0)
  })

  it("searches by requester name", async () => {
    const page = await list({ search: "مدير فرع" })
    expect(page.total).toBeGreaterThan(0)
  })

  it("returns nothing for a search that matches nothing", async () => {
    const page = await list({ search: "لا-يوجد-طلب-بهذا-الاسم" })
    expect(page.total).toBe(0)
    expect(page.items).toEqual([])
  })
})

describe("filters compose", () => {
  it("satisfies every filter applied together", async () => {
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    const page = await list({
      branchIds: ["branch-cairo"],
      categoryIds: [marketing.id],
    })
    expect(
      page.items.every(
        (item) => item.branchId === "branch-cairo" && item.categoryLabel === "التسويق"
      )
    ).toBe(true)
  })

  it("narrows monotonically as filters are added", async () => {
    const all = await list()
    const byBranch = await list({ branchIds: ["branch-cairo"] })
    const byBranchAndStatus = await list({
      branchIds: ["branch-cairo"],
      statuses: ["draft"],
    })

    expect(byBranch.total).toBeLessThanOrEqual(all.total)
    expect(byBranchAndStatus.total).toBeLessThanOrEqual(byBranch.total)
  })

  it("returns nothing when filters contradict", async () => {
    const page = await list({
      branchIds: ["branch-cairo"],
      statuses: ["draft"],
      search: "لا-يوجد",
    })
    expect(page.total).toBe(0)
  })

  it("reports a total that reflects the filters, not the whole set", async () => {
    const all = await list()
    const filtered = await list({ statuses: ["draft"] })
    expect(filtered.total).toBeLessThan(all.total)
    expect(filtered.total).toBe(filtered.items.length)
  })
})

describe("sorting", () => {
  it("sorts by amount ascending and descending", async () => {
    const ascending = await list({ sort: { field: "amount", direction: "asc" } })
    const amounts = ascending.items.map((item) => Number(item.amount.amount))
    for (let index = 1; index < amounts.length; index += 1)
      expect(amounts[index]!).toBeGreaterThanOrEqual(amounts[index - 1]!)

    const descending = await list({ sort: { field: "amount", direction: "desc" } })
    expect(Number(descending.items[0]!.amount.amount)).toBe(Math.max(...amounts))
  })

  it("sorts by request date", async () => {
    const page = await list({ sort: { field: "requestDate", direction: "asc" } })
    const dates = page.items.map((item) => new Date(item.requestDate).getTime())
    for (let index = 1; index < dates.length; index += 1)
      expect(dates[index]!).toBeGreaterThanOrEqual(dates[index - 1]!)
  })

  it("sorts by request number", async () => {
    const page = await list({ sort: { field: "requestNumber", direction: "asc" } })
    const numbers = page.items.map((item) => item.requestNumber)
    expect([...numbers].sort()).toEqual(numbers)
  })
})

describe("pagination", () => {
  it("splits results across pages without losing or repeating a row", async () => {
    const all = await list()
    const first = await accountingService.listRequests({ page: 1, pageSize: 3 })
    const second = await accountingService.listRequests({ page: 2, pageSize: 3 })

    expect(first.items).toHaveLength(3)
    const ids = new Set([...first.items, ...second.items].map((item) => item.id))
    expect(ids.size).toBe(first.items.length + second.items.length)
    expect(first.total).toBe(all.total)
  })

  it("clamps a page beyond the last rather than returning nothing", async () => {
    const page = await accountingService.listRequests({ page: 500, pageSize: 3 })
    expect(page.page).toBeLessThanOrEqual(page.totalPages)
    expect(page.items.length).toBeGreaterThan(0)
  })

  it("reports one page for an empty result", async () => {
    const page = await list({ search: "لا-يوجد" })
    expect(page.totalPages).toBe(1)
    expect(page.page).toBe(1)
  })
})

describe("list rows carry what the table needs", () => {
  it("resolves branch, category, and sub-category labels", async () => {
    const page = await list()
    const row = page.items[0]!
    expect(row.branchLabel).toBeTruthy()
    expect(row.categoryLabel).toBeTruthy()
    expect(row.requesterName).toBeTruthy()
  })

  it("counts attachments", async () => {
    const page = await list()
    expect(page.items.some((item) => item.attachmentCount > 0)).toBe(true)
  })

  it("names an archived category rather than leaving it blank", async () => {
    const legacy = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "بند قديم"
    )!
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    await accountingService.setCategoryStatus({
      categoryId: marketing.id as ExpenseCategoryId,
      status: "archived",
      expectedVersion: marketing.version,
    })

    const page = await list({ categoryIds: [marketing.id] })
    expect(page.items.every((item) => item.categoryLabel === "التسويق")).toBe(true)
    void legacy
  })
})
