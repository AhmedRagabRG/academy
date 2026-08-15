import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type {
  ExpenseCategoryId,
  ExpenseSubCategoryId,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const input = (patch: Record<string, unknown> = {}) => ({
  requestDate: "2026-08-01",
  branchId: "branch-cairo",
  categoryId: "category-marketing" as ExpenseCategoryId,
  subCategoryId: "sub-category-facebook-ads" as ExpenseSubCategoryId,
  description: "حملة إعلانية جديدة",
  amount: "1500.00",
  ...patch,
})

const create = (patch: Record<string, unknown> = {}) =>
  accountingService.createRequest({ input: input(patch) })

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

describe("a created request", () => {
  it("starts as a Draft", async () => {
    const request = await create()
    expect(request.status).toBe("draft")
  })

  it("carries a request number from the configured pattern", async () => {
    const request = await create()
    expect(request.requestNumber).toMatch(/^EXP-2026-\d{5}$/)
  })

  it("gives every request a distinct number", async () => {
    const numbers = new Set<string>()
    for (let index = 0; index < 5; index += 1)
      numbers.add((await create()).requestNumber)
    expect(numbers.size).toBe(5)
  })

  it("does not reuse a number already issued to a seeded request", async () => {
    const created = await create()
    const page = await accountingService.getRequest(created.id)
    expect(page.requestNumber).toBe(created.requestNumber)
    // Seeded requests occupy the first sequence values.
    expect(created.requestNumber).not.toBe("EXP-2026-00001")
  })

  it("names the acting user as requester", async () => {
    const request = await create()
    expect(request.requestedBy.id).toBeTruthy()
    expect(request.requestedBy.name).toBeTruthy()
  })

  it("keeps the figures, category, and description exactly as entered", async () => {
    const request = await create({ amount: "2750.25", description: "  وصف مع مسافات  " })
    expect(request.amount.amount).toBe("2750.25")
    expect(request.amount.currency).toBe("EGP")
    expect(request.description).toBe("وصف مع مسافات")
    expect(request.categoryId).toBe("category-marketing")
    expect(request.subCategoryId).toBe("sub-category-facebook-ads")
  })

  it("accepts a request with no sub-category", async () => {
    const request = await create({ subCategoryId: undefined })
    expect(request.subCategoryId).toBeUndefined()
    expect(request.status).toBe("draft")
  })

  it("starts at version one", async () => {
    expect((await create()).version).toBe(1)
  })

  it("writes exactly one history entry, recording creation", async () => {
    const request = await create()
    expect(request.history).toHaveLength(1)
    expect(request.history[0]!.action).toBe("created")
    // `fromStatus` is null only for creation.
    expect(request.history[0]!.fromStatus).toBeNull()
    expect(request.history[0]!.toStatus).toBe("draft")
  })

  it("reports itself as editable", async () => {
    const request = await create()
    expect(request.derived.isEditable).toBe(true)
  })

  it("resolves the branch and category labels for display", async () => {
    const request = await create()
    expect(request.branchLabel).toBeTruthy()
    expect(request.categoryLabel).toBe("التسويق")
    expect(request.subCategoryLabel).toBe("إعلانات فيسبوك")
  })
})

describe("creation requires its own permission", () => {
  it("is refused without accounting.requests.create", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.requestsCreate])
    const error = await captureError(() => create())
    expect(error.code).toBe("forbidden")
  })

  it("records nothing when refused, so the next number is not consumed", async () => {
    const before = await create()
    accountingScenarios.withoutPermissions([accountingPermissions.requestsCreate])
    await create().catch(() => undefined)
    accountingScenarios.reset()

    const after = await create()
    const sequence = (number: string) => Number(number.split("-").at(-1))
    // A refused creation must not burn a request number, or the audit trail shows
    // a gap that looks like a deleted record.
    expect(sequence(after.requestNumber)).toBe(sequence(before.requestNumber) + 1)
  })

  it("refuses a branch outside the acting user's scope", async () => {
    accountingScenarios.scopeToBranches(["branch-giza"])
    const error = await captureError(() => create({ branchId: "branch-cairo" }))
    expect(error.code).toBe("out-of-scope")
  })
})

describe("creation validates before it records", () => {
  it("refuses a zero or negative amount", async () => {
    expect((await captureError(() => create({ amount: "0" }))).code).toBe(
      "amount-not-positive"
    )
    expect((await captureError(() => create({ amount: "-5" }))).code).toBe(
      "amount-invalid"
    )
  })

  it("refuses a malformed amount", async () => {
    expect((await captureError(() => create({ amount: "abc" }))).code).toBe(
      "amount-invalid"
    )
  })

  it("refuses a missing category", async () => {
    expect((await captureError(() => create({ categoryId: "" }))).code).toBe(
      "category-required"
    )
  })

  it("refuses an archived category", async () => {
    const error = await captureError(() =>
      create({ categoryId: "category-legacy", subCategoryId: undefined })
    )
    expect(error.code).toBe("category-inactive")
  })

  it("refuses a sub-category belonging to another category", async () => {
    const error = await captureError(() =>
      create({ subCategoryId: "sub-category-stationery" })
    )
    expect(error.code).toBe("subcategory-mismatch")
  })

  it("refuses a missing description or branch", async () => {
    expect((await captureError(() => create({ description: "" }))).code).toBe(
      "validation-failed"
    )
    expect((await captureError(() => create({ branchId: "" }))).code).toBe(
      "validation-failed"
    )
  })
})
