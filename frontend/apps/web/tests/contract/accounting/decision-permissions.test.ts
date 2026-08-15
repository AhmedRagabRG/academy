import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type { ExpenseRequestId } from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const UNDER_REVIEW = "request-3" as ExpenseRequestId

const baseline = [
  accountingPermissions.view,
  accountingPermissions.requestsView,
  accountingPermissions.categoriesView,
  accountingPermissions.historyView,
]

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const decide = async () => {
  const current = await accountingService.getRequest(UNDER_REVIEW)
  return accountingService.decideRequest({
    requestId: UNDER_REVIEW,
    decision: "approved",
    expectedVersion: current.version,
  })
}

/**
 * FR-022a. The control only means anything if the key cannot be satisfied by any
 * adjacent one, so these cases grant each neighbouring permission in turn and
 * assert the decision is still refused.
 */
describe("deciding is a distinct authority", () => {
  const neighbours = [
    accountingPermissions.requestsCreate,
    accountingPermissions.requestsUpdate,
    accountingPermissions.requestsSubmit,
    accountingPermissions.requestsReview,
    accountingPermissions.requestsMarkPaid,
    accountingPermissions.requestsCancel,
    accountingPermissions.attachmentsManage,
    accountingPermissions.commentsAdd,
    accountingPermissions.categoriesManage,
    accountingPermissions.export,
  ]

  for (const permission of neighbours) {
    it(`is refused for a user holding ${permission} but not requests.decide`, async () => {
      accountingScenarios.onlyPermissions([...baseline, permission])
      expect((await captureError(decide)).code).toBe("forbidden")
    })
  }

  it("succeeds for a user holding only the decide authority", async () => {
    accountingScenarios.onlyPermissions([
      ...baseline,
      accountingPermissions.requestsDecide,
    ])
    expect((await decide()).status).toBe("approved")
  })

  it("does not let starting a review double as deciding", async () => {
    accountingScenarios.onlyPermissions([
      ...baseline,
      accountingPermissions.requestsReview,
    ])
    // The same user can claim a request for review — that authority is real, and
    // separate from the authority to decide it.
    const submitted = await accountingService.getRequest(
      "request-2" as ExpenseRequestId
    )
    await accountingService.startReview({
      requestId: submitted.id,
      expectedVersion: submitted.version,
    })

    const claimed = await accountingService.getRequest(submitted.id)
    const error = await captureError(() =>
      accountingService.decideRequest({
        requestId: claimed.id,
        decision: "approved",
        expectedVersion: claimed.version,
      })
    )
    expect(error.code).toBe("forbidden")
  })
})

describe("a refused decision records nothing", () => {
  it("leaves the request in its previous state with no history entry", async () => {
    const before = await accountingService.getRequest(UNDER_REVIEW)
    accountingScenarios.onlyPermissions(baseline)
    await decide().catch(() => undefined)
    accountingScenarios.reset()

    const after = await accountingService.getRequest(UNDER_REVIEW)
    expect(after.status).toBe("under-review")
    expect(after.decision).toBeUndefined()
    expect(after.version).toBe(before.version)
    expect(after.history).toHaveLength(before.history.length)
  })

  it("reports forbidden rather than a version conflict", async () => {
    // Authority is checked before concurrency: telling an unauthorized user their
    // view is stale implies they could otherwise act.
    accountingScenarios.onlyPermissions(baseline)
    const error = await captureError(() =>
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "approved",
        expectedVersion: 9999,
      })
    )
    expect(error.code).toBe("forbidden")
  })
})

describe("the projection reports the authority it enforces", () => {
  it("reports decide false when the key is absent", async () => {
    accountingScenarios.onlyPermissions(baseline)
    expect((await accountingService.getRequest(UNDER_REVIEW)).permissions.decide).toBe(
      false
    )
  })

  it("reports decide true when the key is held and the status allows it", async () => {
    accountingScenarios.onlyPermissions([
      ...baseline,
      accountingPermissions.requestsDecide,
    ])
    expect((await accountingService.getRequest(UNDER_REVIEW)).permissions.decide).toBe(
      true
    )
  })

  it("reports decide false on a status where no decision is possible", async () => {
    // Holding the key is not enough; a Draft has no decision to make.
    const draft = await accountingService.getRequest("request-1" as ExpenseRequestId)
    expect(draft.permissions.decide).toBe(false)
  })

  it("offers no decision transitions to a user without the key", async () => {
    accountingScenarios.onlyPermissions(baseline)
    const request = await accountingService.getRequest(UNDER_REVIEW)
    expect(request.derived.availableTransitions).toEqual([])
  })
})
