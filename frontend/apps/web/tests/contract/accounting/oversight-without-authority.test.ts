import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import {
  accountingPermissions,
  oversightPermissions,
} from "@/features/accounting/config/accounting-permissions"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type { ExpenseRequestId } from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const SUBMITTED = "request-2" as ExpenseRequestId
const UNDER_REVIEW = "request-3" as ExpenseRequestId
const APPROVED = "request-5" as ExpenseRequestId
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

/** The Executive Manager's role, as resolved with the author: see everything, decide nothing. */
const asOversight = () => accountingScenarios.onlyPermissions([...oversightPermissions])

describe("oversight can see everything", () => {
  it("reads any request", async () => {
    asOversight()
    for (const id of [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED]) {
      const request = await accountingService.getRequest(id)
      expect(request.id, id).toBe(id)
    }
  })

  it("reads the full history", async () => {
    asOversight()
    const request = await accountingService.getRequest(UNDER_REVIEW)
    expect(request.history.length).toBeGreaterThan(0)
    expect(request.permissions.viewHistory).toBe(true)
  })

  it("reads the lookups", async () => {
    asOversight()
    const lookups = await accountingService.lookups()
    expect(lookups.categories.length).toBeGreaterThan(0)
  })
})

/**
 * "Visibility without participation" is only enforceable because the decision
 * keys are separate — a role check would make this a UI convention.
 */
describe("oversight can decide nothing", () => {
  it("is offered no transitions on any request", async () => {
    asOversight()
    for (const id of [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED]) {
      const request = await accountingService.getRequest(id)
      expect(request.derived.availableTransitions, id).toEqual([])
    }
  })

  it("reports every acting permission as false", async () => {
    asOversight()
    const request = await accountingService.getRequest(UNDER_REVIEW)
    expect(request.permissions.decide).toBe(false)
    expect(request.permissions.review).toBe(false)
    expect(request.permissions.markPaid).toBe(false)
    expect(request.permissions.cancel).toBe(false)
    expect(request.permissions.update).toBe(false)
    expect(request.permissions.submit).toBe(false)
    expect(request.permissions.manageAttachments).toBe(false)
  })

  it("is refused when it attempts a decision directly", async () => {
    asOversight()
    const request = await accountingService.getRequest(UNDER_REVIEW)
    const error = await captureError(() =>
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "approved",
        expectedVersion: request.version,
      })
    )
    expect(error.code).toBe("forbidden")
  })

  it("is refused when it attempts to start a review", async () => {
    asOversight()
    const request = await accountingService.getRequest(SUBMITTED)
    const error = await captureError(() =>
      accountingService.startReview({
        requestId: SUBMITTED,
        expectedVersion: request.version,
      })
    )
    expect(error.code).toBe("forbidden")
  })

  it("is refused when it attempts to cancel", async () => {
    asOversight()
    const request = await accountingService.getRequest(DRAFT)
    const error = await captureError(() =>
      accountingService.cancelRequest({
        requestId: DRAFT,
        reason: "سبب",
        expectedVersion: request.version,
      })
    )
    expect(error.code).toBe("forbidden")
  })

  it("changes nothing across a whole session of attempts", async () => {
    const before = await accountingService.getRequest(UNDER_REVIEW)
    asOversight()
    const version = before.version
    await accountingService
      .decideRequest({ requestId: UNDER_REVIEW, decision: "approved", expectedVersion: version })
      .catch(() => undefined)
    await accountingService
      .startReview({ requestId: UNDER_REVIEW, expectedVersion: version })
      .catch(() => undefined)
    accountingScenarios.reset()

    const after = await accountingService.getRequest(UNDER_REVIEW)
    expect(after.status).toBe(before.status)
    expect(after.version).toBe(before.version)
    expect(after.history).toHaveLength(before.history.length)
  })
})

describe("the oversight set holds no decision key", () => {
  it("excludes every acting permission by construction", () => {
    // Asserting the set itself, so adding a decision key to it fails here rather
    // than silently widening what an Executive Manager can do.
    for (const key of [
      accountingPermissions.requestsDecide,
      accountingPermissions.requestsReview,
      accountingPermissions.requestsMarkPaid,
      accountingPermissions.requestsCancel,
      accountingPermissions.requestsCreate,
      accountingPermissions.requestsUpdate,
      accountingPermissions.requestsSubmit,
      accountingPermissions.categoriesManage,
    ])
      expect(oversightPermissions, key).not.toContain(key)
  })

  it("includes the read keys it needs to be useful", () => {
    for (const key of [
      accountingPermissions.view,
      accountingPermissions.dashboardView,
      accountingPermissions.requestsView,
      accountingPermissions.historyView,
      accountingPermissions.export,
    ])
      expect(oversightPermissions, key).toContain(key)
  })
})
