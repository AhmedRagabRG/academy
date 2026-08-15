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

const DRAFT = "request-1" as ExpenseRequestId
const RETURNED = "request-4" as ExpenseRequestId

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const submit = async (requestId: ExpenseRequestId) => {
  const current = await accountingService.getRequest(requestId)
  return accountingService.submitRequest({
    requestId,
    expectedVersion: current.version,
  })
}

describe("submitting a complete draft", () => {
  it("moves it to Submitted", async () => {
    expect((await submit(DRAFT)).status).toBe("submitted")
  })

  it("makes it no longer editable", async () => {
    const submitted = await submit(DRAFT)
    expect(submitted.derived.isEditable).toBe(false)
    expect(submitted.permissions.update).toBe(false)
  })

  it("writes exactly one history entry naming the transition", async () => {
    const before = await accountingService.getRequest(DRAFT)
    const after = await submit(DRAFT)

    expect(after.history).toHaveLength(before.history.length + 1)
    const entry = after.history.at(-1)!
    expect(entry.action).toBe("submitted")
    expect(entry.fromStatus).toBe("draft")
    expect(entry.toStatus).toBe("submitted")
    expect(entry.performedBy.name).toBeTruthy()
    expect(entry.occurredAt).toBeTruthy()
  })

  it("records a resubmission as its own action, distinct from a first submission", async () => {
    // Returned → Submitted is a resubmission; calling it "submitted" would erase
    // the distinction the history exists to preserve.
    const after = await submit(RETURNED)
    expect(after.status).toBe("submitted")
    expect(after.history.at(-1)!.action).toBe("resubmitted")
    expect(after.history.at(-1)!.fromStatus).toBe("returned-for-revision")
  })

  it("advances the version", async () => {
    const before = await accountingService.getRequest(DRAFT)
    expect((await submit(DRAFT)).version).toBe(before.version + 1)
  })
})

/**
 * A submission validates the *whole* request before the transition, so an invalid
 * record never reaches a reviewer's queue.
 *
 * Note that the API cannot produce an invalid draft in the first place —
 * `updateRequest` runs the same schema — which is itself the point. The case
 * where a category is archived *after* a draft was written needs the category
 * commands, so it is covered in US4's archival suite where those exist.
 */
describe("submission validates the whole request, not just the transition", () => {
  it("submits a draft that satisfies every rule", async () => {
    expect((await submit(DRAFT)).status).toBe("submitted")
  })

  it("refuses a request that is out of the acting user's scope", async () => {
    accountingScenarios.scopeToBranches(["branch-giza"])
    // The seeded draft belongs to branch-cairo.
    expect((await captureError(() => submit(DRAFT))).code).toBe("out-of-scope")
  })

  it("writes no history entry when submission is refused for scope", async () => {
    const before = await accountingService.getRequest(DRAFT)
    accountingScenarios.scopeToBranches(["branch-giza"])
    await submit(DRAFT).catch(() => undefined)
    accountingScenarios.reset()

    const after = await accountingService.getRequest(DRAFT)
    expect(after.status).toBe("draft")
    expect(after.history).toHaveLength(before.history.length)
  })
})

describe("submission requires its own permission", () => {
  it("is refused without accounting.requests.submit", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.requestsSubmit])
    expect((await captureError(() => submit(DRAFT))).code).toBe("forbidden")
  })

  it("is not satisfied by the update permission", async () => {
    accountingScenarios.onlyPermissions([
      accountingPermissions.view,
      accountingPermissions.requestsView,
      accountingPermissions.requestsUpdate,
      accountingPermissions.historyView,
    ])
    expect((await captureError(() => submit(DRAFT))).code).toBe("forbidden")
  })

  it("leaves the request untouched when refused for permission", async () => {
    const before = await accountingService.getRequest(DRAFT)
    accountingScenarios.withoutPermissions([accountingPermissions.requestsSubmit])
    await submit(DRAFT).catch(() => undefined)
    accountingScenarios.reset()

    const after = await accountingService.getRequest(DRAFT)
    expect(after.status).toBe("draft")
    expect(after.version).toBe(before.version)
    expect(after.history).toHaveLength(before.history.length)
  })
})

describe("submission cannot be repeated or applied out of turn", () => {
  it("refuses submitting an already Submitted request", async () => {
    const submitted = await submit(DRAFT)
    const error = await captureError(() =>
      accountingService.submitRequest({
        requestId: DRAFT,
        expectedVersion: submitted.version,
      })
    )
    expect(error.code).toBe("invalid-transition")
    expect(error.details.from).toBe("submitted")
  })

  it("refuses a stale version", async () => {
    const current = await accountingService.getRequest(DRAFT)
    const error = await captureError(() =>
      accountingService.submitRequest({
        requestId: DRAFT,
        expectedVersion: current.version + 2,
      })
    )
    expect(error.code).toBe("version-conflict")
  })
})
