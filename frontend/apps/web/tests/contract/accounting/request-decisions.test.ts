import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type {
  DecisionKind,
  ExpenseRequestId,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const UNDER_REVIEW = "request-3" as ExpenseRequestId
const SUBMITTED = "request-2" as ExpenseRequestId

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const decide = async (
  requestId: ExpenseRequestId,
  decision: DecisionKind,
  note?: string
) => {
  const current = await accountingService.getRequest(requestId)
  return accountingService.decideRequest({
    requestId,
    decision,
    note,
    expectedVersion: current.version,
  })
}

describe("each decision moves the request and records itself", () => {
  it("approves", async () => {
    const result = await decide(UNDER_REVIEW, "approved")
    expect(result.status).toBe("approved")
    expect(result.decision?.decision).toBe("approved")
  })

  it("rejects with a reason and makes the request read-only", async () => {
    const result = await decide(UNDER_REVIEW, "rejected", "خارج الميزانية")
    expect(result.status).toBe("rejected")
    expect(result.derived.isEditable).toBe(false)
    expect(result.derived.availableTransitions).toEqual([])
  })

  it("returns for revision and makes the request editable again", async () => {
    const result = await decide(UNDER_REVIEW, "returned", "يحتاج عرض سعر إضافي")
    expect(result.status).toBe("returned-for-revision")
    expect(result.derived.isEditable).toBe(true)
  })

  it("records the decision, its note, its time, and its author", async () => {
    const result = await decide(UNDER_REVIEW, "rejected", "خارج الميزانية")
    expect(result.decision?.note).toBe("خارج الميزانية")
    expect(result.decision?.decidedBy.name).toBeTruthy()
    expect(Number.isNaN(new Date(result.decision!.decidedAt).getTime())).toBe(false)
  })

  it("names the actor, so an administrative override is visible as one", async () => {
    // FR-022b: a Super Admin approving instead of Finance must be distinguishable.
    accountingScenarios.setContext({
      actor: { id: "user-admin", name: "مدير النظام", active: true },
    })
    const result = await decide(UNDER_REVIEW, "approved")
    expect(result.decision?.decidedBy.name).toBe("مدير النظام")
    expect(result.history.at(-1)!.performedBy.name).toBe("مدير النظام")
  })

  it("writes exactly one history entry per decision", async () => {
    const before = await accountingService.getRequest(UNDER_REVIEW)
    const after = await decide(UNDER_REVIEW, "approved")
    expect(after.history).toHaveLength(before.history.length + 1)
  })

  it("names the action after what happened, not the resulting state", async () => {
    const returned = await decide(UNDER_REVIEW, "returned", "ملاحظة")
    expect(returned.history.at(-1)!.action).toBe("returned")
    expect(returned.history.at(-1)!.toStatus).toBe("returned-for-revision")
  })

  it("clears the reviewer on a return, since it is back with the branch", async () => {
    const reviewed = await accountingService.getRequest(UNDER_REVIEW)
    expect(reviewed.reviewer).toBeDefined()
    const returned = await decide(UNDER_REVIEW, "returned", "ملاحظة")
    expect(returned.reviewer).toBeUndefined()
  })
})

describe("a decision can only be made on a request under review", () => {
  for (const decision of ["approved", "rejected", "returned"] as DecisionKind[]) {
    it(`refuses ${decision} on a Submitted request that no one has claimed`, async () => {
      const error = await captureError(() => decide(SUBMITTED, decision, "ملاحظة"))
      expect(error.code).toBe("invalid-transition")
      expect(error.details.from).toBe("submitted")
    })
  }

  it("refuses a second decision once one has been made", async () => {
    const approved = await decide(UNDER_REVIEW, "approved")
    const error = await captureError(() =>
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "rejected",
        note: "تغيير الرأي",
        expectedVersion: approved.version,
      })
    )
    expect(error.code).toBe("invalid-transition")
  })

  it("names the current status in the refusal, so the reason is actionable", async () => {
    const error = await captureError(() => decide(SUBMITTED, "approved"))
    expect(error.details.from).toBe("submitted")
    expect(error.details.to).toBe("approved")
  })
})

describe("a refused decision changes nothing", () => {
  it("leaves the status, version, and history untouched", async () => {
    const before = await accountingService.getRequest(SUBMITTED)
    await decide(SUBMITTED, "approved").catch(() => undefined)

    const after = await accountingService.getRequest(SUBMITTED)
    expect(after.status).toBe(before.status)
    expect(after.version).toBe(before.version)
    expect(after.history).toHaveLength(before.history.length)
    expect(after.decision).toBeUndefined()
  })

  it("is refused against a stale version", async () => {
    const current = await accountingService.getRequest(UNDER_REVIEW)
    const error = await captureError(() =>
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "approved",
        expectedVersion: current.version + 3,
      })
    )
    expect(error.code).toBe("version-conflict")
  })
})
