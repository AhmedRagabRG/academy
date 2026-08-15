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
  ExpenseStatus,
  ExpenseSubCategoryId,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

/** The seeded requests, one per status, in fixture order. */
const seeded: Record<ExpenseStatus, ExpenseRequestId> = {
  draft: "request-1" as ExpenseRequestId,
  submitted: "request-2" as ExpenseRequestId,
  "under-review": "request-3" as ExpenseRequestId,
  "returned-for-revision": "request-4" as ExpenseRequestId,
  approved: "request-5" as ExpenseRequestId,
  rejected: "request-6" as ExpenseRequestId,
  paid: "request-7" as ExpenseRequestId,
  cancelled: "request-8" as ExpenseRequestId,
}

const editInput = {
  requestDate: "2026-08-01",
  branchId: "branch-cairo",
  categoryId: "category-office" as ExpenseCategoryId,
  subCategoryId: undefined as ExpenseSubCategoryId | undefined,
  description: "وصف محدّث",
  amount: "999.00",
}

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const update = async (requestId: ExpenseRequestId) => {
  const current = await accountingService.getRequest(requestId)
  return accountingService.updateRequest({
    requestId,
    input: editInput,
    expectedVersion: current.version,
  })
}

/** FR-013: a request is editable only while Draft or Returned for Revision. */
describe("only a Draft or Returned request is editable", () => {
  it("allows editing a Draft", async () => {
    const updated = await update(seeded.draft)
    expect(updated.description).toBe("وصف محدّث")
    expect(updated.amount.amount).toBe("999.00")
    expect(updated.status).toBe("draft")
  })

  it("allows editing a Returned request, so a branch can correct it", async () => {
    const updated = await update(seeded["returned-for-revision"])
    expect(updated.description).toBe("وصف محدّث")
    expect(updated.status).toBe("returned-for-revision")
  })

  for (const status of [
    "submitted",
    "under-review",
    "approved",
    "rejected",
    "paid",
    "cancelled",
  ] as const) {
    it(`refuses editing a ${status} request`, async () => {
      const error = await captureError(() => update(seeded[status]))
      expect(error.code).toBe("not-editable")
    })
  }

  it("leaves a non-editable request byte-identical when the edit is refused", async () => {
    const before = await accountingService.getRequest(seeded.submitted)
    await update(seeded.submitted).catch(() => undefined)

    const after = await accountingService.getRequest(seeded.submitted)
    expect(after.description).toBe(before.description)
    expect(after.amount.amount).toBe(before.amount.amount)
    expect(after.version).toBe(before.version)
    expect(after.history).toHaveLength(before.history.length)
  })
})

describe("the projection reports editability it actually enforces", () => {
  it("reports isEditable true only for Draft and Returned", async () => {
    for (const [status, id] of Object.entries(seeded)) {
      const request = await accountingService.getRequest(id)
      const expected = status === "draft" || status === "returned-for-revision"
      expect(request.derived.isEditable, status).toBe(expected)
    }
  })

  it("reports update permission false where editing is refused", async () => {
    const submitted = await accountingService.getRequest(seeded.submitted)
    expect(submitted.permissions.update).toBe(false)
    const draft = await accountingService.getRequest(seeded.draft)
    expect(draft.permissions.update).toBe(true)
  })
})

describe("editing is guarded by the version", () => {
  it("refuses an edit made against a stale view", async () => {
    const current = await accountingService.getRequest(seeded.draft)
    const error = await captureError(() =>
      accountingService.updateRequest({
        requestId: seeded.draft,
        input: editInput,
        expectedVersion: current.version + 3,
      })
    )
    expect(error.code).toBe("version-conflict")
  })

  it("advances the version on a successful edit", async () => {
    const before = await accountingService.getRequest(seeded.draft)
    const after = await update(seeded.draft)
    expect(after.version).toBe(before.version + 1)
  })

  it("checks editability before the version, so a locked request says so", async () => {
    // Telling a user their view is stale when the real problem is that the record
    // is locked sends them to refresh a page that will never help.
    const error = await captureError(() =>
      accountingService.updateRequest({
        requestId: seeded.paid,
        input: editInput,
        expectedVersion: 9999,
      })
    )
    expect(error.code).toBe("not-editable")
  })
})

describe("editing validates the new values", () => {
  it("refuses a zero amount on an otherwise editable request", async () => {
    const current = await accountingService.getRequest(seeded.draft)
    const error = await captureError(() =>
      accountingService.updateRequest({
        requestId: seeded.draft,
        input: { ...editInput, amount: "0" },
        expectedVersion: current.version,
      })
    )
    expect(error.code).toBe("amount-not-positive")
  })

  it("writes no history entry for an edit", async () => {
    // An edit is not a transition; recording one would make the history a diary.
    const before = await accountingService.getRequest(seeded.draft)
    const after = await update(seeded.draft)
    expect(after.history).toHaveLength(before.history.length)
  })
})
