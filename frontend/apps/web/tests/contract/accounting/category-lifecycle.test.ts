import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type { ExpenseCategoryId } from "@/features/accounting/types/common"

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

const create = (name: string, description = "وصف") =>
  accountingService.createCategory({ input: { name, description } })

describe("the category lifecycle", () => {
  it("creates a category as active and offers it immediately", async () => {
    const created = await create("تصنيف جديد")
    expect(created.status).toBe("active")

    const page = await accountingService.listCategories({ ...paging, activeOnly: true })
    expect(page.items.map((item) => item.id)).toContain(created.id)
  })

  it("edits name and description", async () => {
    const created = await create("تصنيف جديد")
    const updated = await accountingService.updateCategory({
      categoryId: created.id,
      input: { name: "اسم محدّث", description: "وصف محدّث" },
      expectedVersion: created.version,
    })
    expect(updated.name).toBe("اسم محدّث")
    expect(updated.description).toBe("وصف محدّث")
    expect(updated.version).toBe(created.version + 1)
  })

  it("archives and reactivates", async () => {
    const created = await create("تصنيف جديد")
    const archived = await accountingService.setCategoryStatus({
      categoryId: created.id,
      status: "archived",
      expectedVersion: created.version,
    })
    expect(archived.status).toBe("archived")

    const reactivated = await accountingService.setCategoryStatus({
      categoryId: created.id,
      status: "active",
      expectedVersion: archived.version,
    })
    expect(reactivated.status).toBe("active")
  })

  it("counts its sub-categories", async () => {
    const page = await accountingService.listCategories(paging)
    const marketing = page.items.find((item) => item.name === "التسويق")!
    expect(marketing.subCategoryCount).toBeGreaterThan(0)
  })

  it("never deletes — archiving is the only removal", () => {
    const names = Object.keys(accountingService)
    expect(names.filter((name) => /deleteCategory|removeCategory/i.test(name))).toEqual(
      []
    )
  })
})

describe("category names are unique across the organization", () => {
  it("refuses a duplicate name", async () => {
    await create("تصنيف فريد")
    const error = await captureError(() => create("تصنيف فريد"))
    expect(error.code).toBe("duplicate-name")
  })

  it("refuses a duplicate that differs only by whitespace or case", async () => {
    await create("Marketing")
    // Two rows a user cannot tell apart is worse than a refusal.
    expect((await captureError(() => create("  marketing  "))).code).toBe(
      "duplicate-name"
    )
  })

  it("refuses renaming onto an existing name", async () => {
    const first = await create("الأول")
    await create("الثاني")
    const error = await captureError(() =>
      accountingService.updateCategory({
        categoryId: first.id,
        input: { name: "الثاني", description: "" },
        expectedVersion: first.version,
      })
    )
    expect(error.code).toBe("duplicate-name")
  })

  it("allows renaming a category to its own current name", async () => {
    const created = await create("تصنيف")
    const updated = await accountingService.updateCategory({
      categoryId: created.id,
      input: { name: "تصنيف", description: "وصف مختلف" },
      expectedVersion: created.version,
    })
    expect(updated.description).toBe("وصف مختلف")
  })

  it("collides with an archived name too, since reactivating would duplicate", async () => {
    const created = await create("تصنيف")
    await accountingService.setCategoryStatus({
      categoryId: created.id,
      status: "archived",
      expectedVersion: created.version,
    })
    expect((await captureError(() => create("تصنيف"))).code).toBe("duplicate-name")
  })
})

describe("managing categories requires its own permission", () => {
  it("refuses create, update, and archive without categories.manage", async () => {
    const existing = (await accountingService.listCategories(paging)).items[0]!
    accountingScenarios.withoutPermissions([accountingPermissions.categoriesManage])

    expect((await captureError(() => create("جديد"))).code).toBe("forbidden")
    expect(
      (
        await captureError(() =>
          accountingService.updateCategory({
            categoryId: existing.id,
            input: { name: "x", description: "" },
            expectedVersion: existing.version,
          })
        )
      ).code
    ).toBe("forbidden")
    expect(
      (
        await captureError(() =>
          accountingService.setCategoryStatus({
            categoryId: existing.id,
            status: "archived",
            expectedVersion: existing.version,
          })
        )
      ).code
    ).toBe("forbidden")
  })

  it("still allows reading with only the view permission", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.categoriesManage])
    const page = await accountingService.listCategories(paging)
    expect(page.items.length).toBeGreaterThan(0)
  })

  it("refuses reading without the view permission", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.categoriesView])
    expect((await captureError(() => accountingService.listCategories(paging))).code).toBe(
      "forbidden"
    )
  })

  it("changes nothing when refused", async () => {
    const before = await accountingService.listCategories(paging)
    accountingScenarios.withoutPermissions([accountingPermissions.categoriesManage])
    await create("لن يُنشأ").catch(() => undefined)
    accountingScenarios.reset()

    const after = await accountingService.listCategories(paging)
    expect(after.total).toBe(before.total)
  })
})

describe("category edits are guarded by the version", () => {
  it("refuses an edit against a stale version", async () => {
    const created = await create("تصنيف")
    const error = await captureError(() =>
      accountingService.updateCategory({
        categoryId: created.id,
        input: { name: "آخر", description: "" },
        expectedVersion: created.version + 2,
      })
    )
    expect(error.code).toBe("version-conflict")
  })

  it("refuses a status change against a stale version", async () => {
    const created = await create("تصنيف")
    expect(
      (
        await captureError(() =>
          accountingService.setCategoryStatus({
            categoryId: created.id,
            status: "archived",
            expectedVersion: created.version + 2,
          })
        )
      ).code
    ).toBe("version-conflict")
  })

  it("refuses an operation on a category that does not exist", async () => {
    expect(
      (
        await captureError(() =>
          accountingService.setCategoryStatus({
            categoryId: "category-nope" as ExpenseCategoryId,
            status: "archived",
            expectedVersion: 1,
          })
        )
      ).code
    ).toBe("not-found")
  })
})
