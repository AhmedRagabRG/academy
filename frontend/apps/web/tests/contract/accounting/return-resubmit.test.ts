import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import type {
  ExpenseCategoryId,
  ExpenseRequestId,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const UNDER_REVIEW = "request-3" as ExpenseRequestId

const reload = (id: ExpenseRequestId) => accountingService.getRequest(id)

/**
 * The correction loop the spec describes, and the reason approval can be
 * all-or-nothing: a wrong amount is fixed by returning the request, so the
 * correction lands in the history instead of being applied silently at approval.
 */
describe("return, correct, resubmit", () => {
  it("walks the full loop and ends approved at the corrected amount", async () => {
    const original = await reload(UNDER_REVIEW)
    const originalAmount = original.amount.amount

    // Finance returns it asking for a corrected figure.
    const returned = await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "returned",
      note: "المبلغ يحتاج تصحيحًا",
      expectedVersion: original.version,
    })
    expect(returned.status).toBe("returned-for-revision")
    expect(returned.derived.isEditable).toBe(true)

    // The branch corrects the amount.
    const corrected = await accountingService.updateRequest({
      requestId: UNDER_REVIEW,
      input: {
        requestDate: returned.requestDate,
        branchId: returned.branchId,
        categoryId: returned.categoryId as ExpenseCategoryId,
        subCategoryId: returned.subCategoryId,
        description: returned.description,
        amount: "7777.00",
      },
      expectedVersion: returned.version,
    })
    expect(corrected.amount.amount).toBe("7777.00")
    expect(corrected.amount.amount).not.toBe(originalAmount)

    // And resubmits.
    const resubmitted = await accountingService.submitRequest({
      requestId: UNDER_REVIEW,
      expectedVersion: corrected.version,
    })
    expect(resubmitted.status).toBe("submitted")

    const reviewing = await accountingService.startReview({
      requestId: UNDER_REVIEW,
      expectedVersion: resubmitted.version,
    })
    const approved = await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "approved",
      expectedVersion: reviewing.version,
    })

    expect(approved.status).toBe("approved")
    // The approved figure is the corrected one — there is no second "approved
    // amount" anywhere in the model.
    expect(approved.amount.amount).toBe("7777.00")
    expect("approvedAmount" in approved).toBe(false)
  })

  it("shows the return and the resubmission as separate history entries", async () => {
    const original = await reload(UNDER_REVIEW)
    const returned = await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "returned",
      note: "تصحيح مطلوب",
      expectedVersion: original.version,
    })
    const resubmitted = await accountingService.submitRequest({
      requestId: UNDER_REVIEW,
      expectedVersion: returned.version,
    })

    const actions = resubmitted.history.map((entry) => entry.action)
    expect(actions).toContain("returned")
    expect(actions).toContain("resubmitted")
    // A resubmission is a distinct event, not a repeat of the first submission.
    expect(actions.filter((action) => action === "submitted")).toHaveLength(1)
  })

  it("keeps the whole journey, not just the latest state", async () => {
    const original = await reload(UNDER_REVIEW)
    const returned = await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "returned",
      note: "تصحيح",
      expectedVersion: original.version,
    })
    const resubmitted = await accountingService.submitRequest({
      requestId: UNDER_REVIEW,
      expectedVersion: returned.version,
    })
    const reviewing = await accountingService.startReview({
      requestId: UNDER_REVIEW,
      expectedVersion: resubmitted.version,
    })
    const approved = await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "approved",
      expectedVersion: reviewing.version,
    })

    expect(approved.history.map((entry) => entry.action)).toEqual([
      "created",
      "submitted",
      "review-started",
      "returned",
      "resubmitted",
      "review-started",
      "approved",
    ])
  })

  it("can be returned more than once, each recorded", async () => {
    let current = await reload(UNDER_REVIEW)
    for (const note of ["أول تصحيح", "ثاني تصحيح"]) {
      const returned = await accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "returned",
        note,
        expectedVersion: current.version,
      })
      const resubmitted = await accountingService.submitRequest({
        requestId: UNDER_REVIEW,
        expectedVersion: returned.version,
      })
      current = await accountingService.startReview({
        requestId: UNDER_REVIEW,
        expectedVersion: resubmitted.version,
      })
    }

    const actions = current.history.map((entry) => entry.action)
    expect(actions.filter((action) => action === "returned")).toHaveLength(2)
    expect(actions.filter((action) => action === "resubmitted")).toHaveLength(2)
  })

  it("keeps both notes, so the reason for each return survives", async () => {
    let current = await reload(UNDER_REVIEW)
    for (const note of ["أول تصحيح", "ثاني تصحيح"]) {
      const returned = await accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "returned",
        note,
        expectedVersion: current.version,
      })
      const resubmitted = await accountingService.submitRequest({
        requestId: UNDER_REVIEW,
        expectedVersion: returned.version,
      })
      current = await accountingService.startReview({
        requestId: UNDER_REVIEW,
        expectedVersion: resubmitted.version,
      })
    }

    const notes = current.history
      .filter((entry) => entry.action === "returned")
      .map((entry) => entry.note)
    expect(notes).toEqual(["أول تصحيح", "ثاني تصحيح"])
  })
})

describe("a returned request is genuinely back with its branch", () => {
  it("becomes editable and reports update permission", async () => {
    const original = await reload(UNDER_REVIEW)
    const returned = await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "returned",
      note: "تصحيح",
      expectedVersion: original.version,
    })
    expect(returned.permissions.update).toBe(true)
    expect(returned.permissions.submit).toBe(true)
    expect(returned.permissions.decide).toBe(false)
  })

  it("offers resubmission and cancellation, and nothing else", async () => {
    const original = await reload(UNDER_REVIEW)
    const returned = await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "returned",
      note: "تصحيح",
      expectedVersion: original.version,
    })
    expect([...returned.derived.availableTransitions].sort()).toEqual([
      "cancelled",
      "submitted",
    ])
  })
})
