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

const APPROVED = "request-5" as ExpenseRequestId
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

const markPaid = async () => {
  const current = await accountingService.getRequest(APPROVED)
  return accountingService.markPaid({
    requestId: APPROVED,
    expectedVersion: current.version,
  })
}

/**
 * FR-027. Taking the decision and releasing the funds are different jobs, and the
 * separation only means anything if the key cannot be satisfied by any adjacent
 * one — including, especially, the decide permission.
 */
describe("marking paid is a distinct authority", () => {
  const neighbours = [
    accountingPermissions.requestsDecide,
    accountingPermissions.requestsReview,
    accountingPermissions.requestsCreate,
    accountingPermissions.requestsUpdate,
    accountingPermissions.requestsSubmit,
    accountingPermissions.requestsCancel,
    accountingPermissions.attachmentsManage,
    accountingPermissions.categoriesManage,
    accountingPermissions.export,
  ]

  for (const permission of neighbours) {
    it(`is refused for a user holding ${permission} but not requests.markPaid`, async () => {
      accountingScenarios.onlyPermissions([...baseline, permission])
      expect((await captureError(markPaid)).code).toBe("forbidden")
    })
  }

  it("succeeds for a user holding only the mark-paid authority", async () => {
    accountingScenarios.onlyPermissions([
      ...baseline,
      accountingPermissions.requestsMarkPaid,
    ])
    expect((await markPaid()).status).toBe("paid")
  })

  it("does not let approving double as paying", async () => {
    // The same user can approve — that authority is real, and separate.
    accountingScenarios.onlyPermissions([
      ...baseline,
      accountingPermissions.requestsDecide,
    ])
    const reviewing = await accountingService.getRequest(UNDER_REVIEW)
    const approved = await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "approved",
      expectedVersion: reviewing.version,
    })
    expect(approved.status).toBe("approved")

    const error = await captureError(() =>
      accountingService.markPaid({
        requestId: UNDER_REVIEW,
        expectedVersion: approved.version,
      })
    )
    expect(error.code).toBe("forbidden")
  })

  it("records nothing when refused", async () => {
    const before = await accountingService.getRequest(APPROVED)
    accountingScenarios.onlyPermissions(baseline)
    await markPaid().catch(() => undefined)
    accountingScenarios.reset()

    const after = await accountingService.getRequest(APPROVED)
    expect(after.status).toBe("approved")
    expect(after.paidAt).toBeUndefined()
    expect(after.version).toBe(before.version)
    expect(after.history).toHaveLength(before.history.length)
  })
})

describe("the projection reports the authority it enforces", () => {
  it("reports markPaid false without the key", async () => {
    accountingScenarios.onlyPermissions([
      ...baseline,
      accountingPermissions.requestsDecide,
    ])
    expect((await accountingService.getRequest(APPROVED)).permissions.markPaid).toBe(false)
  })

  it("reports markPaid true with the key on an Approved request", async () => {
    accountingScenarios.onlyPermissions([
      ...baseline,
      accountingPermissions.requestsMarkPaid,
    ])
    expect((await accountingService.getRequest(APPROVED)).permissions.markPaid).toBe(true)
  })

  it("reports markPaid false on a status that cannot be paid, key or not", async () => {
    accountingScenarios.onlyPermissions([
      ...baseline,
      accountingPermissions.requestsMarkPaid,
    ])
    expect(
      (await accountingService.getRequest(UNDER_REVIEW)).permissions.markPaid
    ).toBe(false)
  })

  it("offers the paid transition only where both the status and the key allow it", async () => {
    accountingScenarios.onlyPermissions([
      ...baseline,
      accountingPermissions.requestsMarkPaid,
    ])
    expect(
      (await accountingService.getRequest(APPROVED)).derived.availableTransitions
    ).toEqual(["paid"])

    accountingScenarios.onlyPermissions(baseline)
    expect(
      (await accountingService.getRequest(APPROVED)).derived.availableTransitions
    ).toEqual([])
  })
})
