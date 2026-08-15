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

const SUBMITTED = "request-2" as ExpenseRequestId
const DRAFT = "request-1" as ExpenseRequestId
const APPROVED = "request-5" as ExpenseRequestId

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const startReview = async (requestId: ExpenseRequestId) => {
  const current = await accountingService.getRequest(requestId)
  return accountingService.startReview({
    requestId,
    expectedVersion: current.version,
  })
}

/**
 * Research R2. The tempting implementation flips the status when a reviewer opens
 * the detail page — which makes a GET mutate state. An executive glancing at a
 * request would silently claim it, and the history would fill with entries nobody
 * performed deliberately.
 */
describe("reading a request never changes it", () => {
  it("leaves a Submitted request Submitted when it is merely opened", async () => {
    const before = await accountingService.getRequest(SUBMITTED)
    expect(before.status).toBe("submitted")

    await accountingService.getRequest(SUBMITTED)
    await accountingService.getRequest(SUBMITTED)

    const after = await accountingService.getRequest(SUBMITTED)
    expect(after.status).toBe("submitted")
    expect(after.version).toBe(before.version)
    expect(after.reviewer).toBeUndefined()
  })

  it("writes no history entry for a read, however many times it is read", async () => {
    const before = await accountingService.getRequest(SUBMITTED)
    for (let index = 0; index < 5; index += 1)
      await accountingService.getRequest(SUBMITTED)

    const after = await accountingService.getRequest(SUBMITTED)
    expect(after.history).toHaveLength(before.history.length)
  })

  it("does not claim the request for whoever read it", async () => {
    await accountingService.getRequest(SUBMITTED)
    const after = await accountingService.getRequest(SUBMITTED)
    expect(after.reviewer).toBeUndefined()
  })
})

describe("starting a review is an explicit act", () => {
  it("moves the request to Under Review", async () => {
    expect((await startReview(SUBMITTED)).status).toBe("under-review")
  })

  it("records who is reviewing it", async () => {
    const reviewed = await startReview(SUBMITTED)
    expect(reviewed.reviewer?.id).toBeTruthy()
    expect(reviewed.reviewer?.name).toBeTruthy()
  })

  it("writes exactly one history entry naming the transition", async () => {
    const before = await accountingService.getRequest(SUBMITTED)
    const after = await startReview(SUBMITTED)

    expect(after.history).toHaveLength(before.history.length + 1)
    const entry = after.history.at(-1)!
    expect(entry.action).toBe("review-started")
    expect(entry.fromStatus).toBe("submitted")
    expect(entry.toStatus).toBe("under-review")
  })

  it("advances the version", async () => {
    const before = await accountingService.getRequest(SUBMITTED)
    expect((await startReview(SUBMITTED)).version).toBe(before.version + 1)
  })
})

describe("review can only start from Submitted", () => {
  it("refuses starting a review on a Draft", async () => {
    const error = await captureError(() => startReview(DRAFT))
    expect(error.code).toBe("invalid-transition")
    expect(error.details.from).toBe("draft")
  })

  it("refuses starting a review on an already Approved request", async () => {
    expect((await captureError(() => startReview(APPROVED))).code).toBe(
      "invalid-transition"
    )
  })

  it("refuses starting a review twice", async () => {
    const reviewed = await startReview(SUBMITTED)
    const error = await captureError(() =>
      accountingService.startReview({
        requestId: SUBMITTED,
        expectedVersion: reviewed.version,
      })
    )
    expect(error.code).toBe("invalid-transition")
  })
})

describe("starting a review requires its own permission", () => {
  it("is refused without accounting.requests.review", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.requestsReview])
    expect((await captureError(() => startReview(SUBMITTED))).code).toBe("forbidden")
  })

  it("is not satisfied by the decide permission", async () => {
    // Deciding and claiming for review are different authorities.
    accountingScenarios.onlyPermissions([
      accountingPermissions.view,
      accountingPermissions.requestsView,
      accountingPermissions.requestsDecide,
      accountingPermissions.historyView,
    ])
    expect((await captureError(() => startReview(SUBMITTED))).code).toBe("forbidden")
  })

  it("leaves the request untouched when refused", async () => {
    const before = await accountingService.getRequest(SUBMITTED)
    accountingScenarios.withoutPermissions([accountingPermissions.requestsReview])
    await startReview(SUBMITTED).catch(() => undefined)
    accountingScenarios.reset()

    const after = await accountingService.getRequest(SUBMITTED)
    expect(after.status).toBe("submitted")
    expect(after.reviewer).toBeUndefined()
    expect(after.history).toHaveLength(before.history.length)
  })

  it("is refused against a stale version", async () => {
    const current = await accountingService.getRequest(SUBMITTED)
    const error = await captureError(() =>
      accountingService.startReview({
        requestId: SUBMITTED,
        expectedVersion: current.version + 2,
      })
    )
    expect(error.code).toBe("version-conflict")
  })
})
