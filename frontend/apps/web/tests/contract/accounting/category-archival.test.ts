import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type {
  ExpenseCategoryId,
  ExpenseRequestId,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const paging = { page: 1, pageSize: 100 }
const DRAFT = "request-1" as ExpenseRequestId

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const archive = async (categoryId: ExpenseCategoryId) => {
  const category = await accountingService.resolveCategory(categoryId)
  return accountingService.setCategoryStatus({
    categoryId,
    status: "archived",
    expectedVersion: category!.version,
  })
}

/**
 * FR-006 has two halves that pull against each other, and both must hold: an
 * archived category disappears from the choices, **and** stays visible on every
 * request that already uses it. Serving both from one read is impossible, which
 * is why there are two (research R7).
 */
describe("an archived category leaves the pickers", () => {
  it("is excluded from the active list", async () => {
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    await archive(marketing.id)

    const active = await accountingService.listCategories({ ...paging, activeOnly: true })
    expect(active.items.map((item) => item.id)).not.toContain(marketing.id)
  })

  it("is excluded from the lookups a form offers", async () => {
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    await archive(marketing.id)

    const lookups = await accountingService.lookups()
    expect(lookups.categories.map((item) => item.id)).not.toContain(marketing.id)
  })

  it("takes its sub-categories out of the choices with it", async () => {
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    const before = await accountingService.listSubCategories({
      ...paging,
      activeOnly: true,
      categoryIds: [marketing.id],
    })
    expect(before.total).toBeGreaterThan(0)

    await archive(marketing.id)

    const after = await accountingService.listSubCategories({
      ...paging,
      activeOnly: true,
      categoryIds: [marketing.id],
    })
    expect(after.total).toBe(0)
  })

  it("does not change the sub-categories' own status", async () => {
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    await archive(marketing.id)

    // They are hidden because their parent is archived, not because they were
    // archived — reactivating the parent must restore them.
    const all = await accountingService.listSubCategories({
      ...paging,
      categoryIds: [marketing.id],
    })
    expect(all.items.every((item) => item.status === "active")).toBe(true)
  })

  it("restores everything when the parent is reactivated", async () => {
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    const archived = await archive(marketing.id)
    await accountingService.setCategoryStatus({
      categoryId: marketing.id,
      status: "active",
      expectedVersion: archived.version,
    })

    const active = await accountingService.listSubCategories({
      ...paging,
      activeOnly: true,
      categoryIds: [marketing.id],
    })
    expect(active.total).toBeGreaterThan(0)
  })
})

describe("an archived category stays visible where it was already used", () => {
  it("still resolves by id, unlike the picker read", async () => {
    const legacy = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "بند قديم"
    )!
    expect(legacy.status).toBe("archived")

    const resolved = await accountingService.resolveCategory(legacy.id)
    expect(resolved?.name).toBe("بند قديم")
  })

  it("still renders on a request that references it", async () => {
    const request = await accountingService.getRequest(DRAFT)
    await archive(request.categoryId as ExpenseCategoryId)

    const after = await accountingService.getRequest(DRAFT)
    // Serving display from the filtered list would blank the category and
    // silently rewrite the past.
    expect(after.categoryLabel).toBe(request.categoryLabel)
    expect(after.categoryLabel).not.toBe("")
    expect(after.categoryStatus).toBe("archived")
  })

  it("reports the archived status, so the UI can mark it as such", async () => {
    const request = await accountingService.getRequest(DRAFT)
    await archive(request.categoryId as ExpenseCategoryId)
    expect((await accountingService.getRequest(DRAFT)).categoryStatus).toBe("archived")
  })
})

/**
 * The edge case the spec names, moved here from US1 because it needs the category
 * commands: a category archived while a draft that uses it is still unsubmitted.
 */
describe("a draft using a category archived after it was written", () => {
  it("is refused at submission, naming the archived category", async () => {
    const request = await accountingService.getRequest(DRAFT)
    await archive(request.categoryId as ExpenseCategoryId)

    const current = await accountingService.getRequest(DRAFT)
    const error = await captureError(() =>
      accountingService.submitRequest({
        requestId: DRAFT,
        expectedVersion: current.version,
      })
    )
    expect(error.code).toBe("category-inactive")
  })

  it("stays a Draft with its history untouched when refused", async () => {
    const request = await accountingService.getRequest(DRAFT)
    await archive(request.categoryId as ExpenseCategoryId)

    const before = await accountingService.getRequest(DRAFT)
    await accountingService
      .submitRequest({ requestId: DRAFT, expectedVersion: before.version })
      .catch(() => undefined)

    const after = await accountingService.getRequest(DRAFT)
    expect(after.status).toBe("draft")
    expect(after.history).toHaveLength(before.history.length)
  })

  it("can be submitted once the category is reactivated", async () => {
    const request = await accountingService.getRequest(DRAFT)
    const archived = await archive(request.categoryId as ExpenseCategoryId)
    await accountingService.setCategoryStatus({
      categoryId: request.categoryId as ExpenseCategoryId,
      status: "active",
      expectedVersion: archived.version,
    })

    const current = await accountingService.getRequest(DRAFT)
    const submitted = await accountingService.submitRequest({
      requestId: DRAFT,
      expectedVersion: current.version,
    })
    expect(submitted.status).toBe("submitted")
  })

  it("refuses choosing an already-archived category on a new request", async () => {
    const legacy = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "بند قديم"
    )!
    const error = await captureError(() =>
      accountingService.createRequest({
        input: {
          requestDate: "2026-08-01",
          branchId: "branch-cairo",
          categoryId: legacy.id,
          description: "طلب",
          amount: "100.00",
        },
      })
    )
    expect(error.code).toBe("category-inactive")
  })
})
