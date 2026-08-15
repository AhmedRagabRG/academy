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
  ExpenseSubCategoryId,
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

const categoryNamed = async (name: string) =>
  (await accountingService.listCategories(paging)).items.find(
    (item) => item.name === name
  )!

const subCategoryNamed = async (name: string) =>
  (await accountingService.listSubCategories(paging)).items.find(
    (item) => item.name === name
  )!

describe("a sub-category belongs to exactly one parent", () => {
  it("is created under the parent it names", async () => {
    const office = await categoryNamed("المكتب")
    const created = await accountingService.createSubCategory({
      categoryId: office.id,
      input: { name: "أحبار", description: "" },
    })
    expect(created.categoryId).toBe(office.id)
    expect(created.categoryLabel).toBe("المكتب")
  })

  it("is offered only under that parent", async () => {
    const marketing = await categoryNamed("التسويق")
    const office = await categoryNamed("المكتب")

    const underMarketing = await accountingService.listSubCategories({
      ...paging,
      categoryIds: [marketing.id],
    })
    expect(underMarketing.items.every((item) => item.categoryId === marketing.id)).toBe(
      true
    )
    expect(underMarketing.items.map((item) => item.name)).not.toContain("قرطاسية")

    const underOffice = await accountingService.listSubCategories({
      ...paging,
      categoryIds: [office.id],
    })
    expect(underOffice.items.map((item) => item.name)).toContain("قرطاسية")
  })

  it("refuses creation under a parent that does not exist", async () => {
    const error = await captureError(() =>
      accountingService.createSubCategory({
        categoryId: "category-nope" as ExpenseCategoryId,
        input: { name: "بند", description: "" },
      })
    )
    expect(error.code).toBe("not-found")
  })
})

/**
 * Names are unique within a parent, not across the organization: "المطبوعات"
 * under Marketing and under Office are different things, and forbidding that
 * would push users into inventing awkward names.
 */
describe("sub-category names are unique within their parent only", () => {
  it("refuses a duplicate under the same parent", async () => {
    const marketing = await categoryNamed("التسويق")
    const error = await captureError(() =>
      accountingService.createSubCategory({
        categoryId: marketing.id,
        input: { name: "المطبوعات", description: "" },
      })
    )
    expect(error.code).toBe("duplicate-name")
  })

  it("allows the same name under a different parent", async () => {
    const office = await categoryNamed("المكتب")
    const created = await accountingService.createSubCategory({
      categoryId: office.id,
      input: { name: "المطبوعات", description: "" },
    })
    expect(created.name).toBe("المطبوعات")
  })

  it("refuses renaming onto a sibling's name", async () => {
    const printing = await subCategoryNamed("المطبوعات")
    const error = await captureError(() =>
      accountingService.updateSubCategory({
        subCategoryId: printing.id,
        input: { name: "التصميم", description: "" },
        expectedVersion: printing.version,
      })
    )
    expect(error.code).toBe("duplicate-name")
  })

  it("allows renaming a sub-category to its own name", async () => {
    const printing = await subCategoryNamed("المطبوعات")
    const updated = await accountingService.updateSubCategory({
      subCategoryId: printing.id,
      input: { name: "المطبوعات", description: "وصف جديد" },
      expectedVersion: printing.version,
    })
    expect(updated.description).toBe("وصف جديد")
  })
})

describe("a request's sub-category must match its category", () => {
  it("refuses a mismatched pair on creation", async () => {
    const marketing = await categoryNamed("التسويق")
    const stationery = await subCategoryNamed("قرطاسية")

    const error = await captureError(() =>
      accountingService.createRequest({
        input: {
          requestDate: "2026-08-01",
          branchId: "branch-cairo",
          categoryId: marketing.id,
          subCategoryId: stationery.id,
          description: "طلب",
          amount: "100.00",
        },
      })
    )
    expect(error.code).toBe("subcategory-mismatch")
  })

  it("refuses a mismatched pair on edit", async () => {
    const current = await accountingService.getRequest(DRAFT)
    const stationery = await subCategoryNamed("قرطاسية")

    const error = await captureError(() =>
      accountingService.updateRequest({
        requestId: DRAFT,
        input: {
          requestDate: current.requestDate,
          branchId: current.branchId,
          categoryId: current.categoryId as ExpenseCategoryId,
          subCategoryId: stationery.id as ExpenseSubCategoryId,
          description: current.description,
          amount: current.amount.amount,
        },
        expectedVersion: current.version,
      })
    )
    expect(error.code).toBe("subcategory-mismatch")
  })

  it("accepts a matched pair", async () => {
    const marketing = await categoryNamed("التسويق")
    const facebook = await subCategoryNamed("إعلانات فيسبوك")

    const created = await accountingService.createRequest({
      input: {
        requestDate: "2026-08-01",
        branchId: "branch-cairo",
        categoryId: marketing.id,
        subCategoryId: facebook.id,
        description: "طلب",
        amount: "100.00",
      },
    })
    expect(created.subCategoryId).toBe(facebook.id)
  })

  it("refuses an archived sub-category even under the right parent", async () => {
    const marketing = await categoryNamed("التسويق")
    const design = await subCategoryNamed("التصميم")
    await accountingService.setSubCategoryStatus({
      subCategoryId: design.id,
      status: "archived",
      expectedVersion: design.version,
    })

    const error = await captureError(() =>
      accountingService.createRequest({
        input: {
          requestDate: "2026-08-01",
          branchId: "branch-cairo",
          categoryId: marketing.id,
          subCategoryId: design.id,
          description: "طلب",
          amount: "100.00",
        },
      })
    )
    expect(error.code).toBe("subcategory-mismatch")
  })
})

describe("archiving a sub-category", () => {
  it("removes it from the choices while its parent stays active", async () => {
    const design = await subCategoryNamed("التصميم")
    await accountingService.setSubCategoryStatus({
      subCategoryId: design.id,
      status: "archived",
      expectedVersion: design.version,
    })

    const active = await accountingService.listSubCategories({
      ...paging,
      activeOnly: true,
    })
    expect(active.items.map((item) => item.id)).not.toContain(design.id)
  })

  it("keeps it resolvable for display", async () => {
    const design = await subCategoryNamed("التصميم")
    await accountingService.setSubCategoryStatus({
      subCategoryId: design.id,
      status: "archived",
      expectedVersion: design.version,
    })
    expect((await accountingService.resolveSubCategory(design.id))?.name).toBe("التصميم")
  })

  it("can be reactivated", async () => {
    const design = await subCategoryNamed("التصميم")
    const archived = await accountingService.setSubCategoryStatus({
      subCategoryId: design.id,
      status: "archived",
      expectedVersion: design.version,
    })
    const reactivated = await accountingService.setSubCategoryStatus({
      subCategoryId: design.id,
      status: "active",
      expectedVersion: archived.version,
    })
    expect(reactivated.status).toBe("active")
  })
})
