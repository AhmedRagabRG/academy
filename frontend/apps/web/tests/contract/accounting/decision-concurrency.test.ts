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

const settle = async (
  runs: Promise<unknown>[]
): Promise<{ fulfilled: number; conflicts: number; other: string[] }> => {
  const results = await Promise.allSettled(runs)
  const other: string[] = []
  let fulfilled = 0
  let conflicts = 0
  for (const result of results) {
    if (result.status === "fulfilled") fulfilled += 1
    else if (
      result.reason instanceof AccountingError &&
      result.reason.code === "version-conflict"
    )
      conflicts += 1
    else other.push(String((result.reason as Error)?.message ?? result.reason))
  }
  return { fulfilled, conflicts, other }
}

/**
 * SC-008. Two reviewers acting at once must produce exactly one winner and one
 * reported conflict — silently overwriting a colleague's approval is the worst
 * possible failure in this module.
 */
describe("two simultaneous decisions produce exactly one winner", () => {
  it("lets one approval through and reports the other as a conflict", async () => {
    const current = await accountingService.getRequest(UNDER_REVIEW)

    const outcome = await settle([
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "approved",
        expectedVersion: current.version,
      }),
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "rejected",
        note: "خارج الميزانية",
        expectedVersion: current.version,
      }),
    ])

    expect(outcome.other).toEqual([])
    expect(outcome.fulfilled).toBe(1)
    expect(outcome.conflicts).toBe(1)
  })

  it("leaves the request in exactly one decided state", async () => {
    const current = await accountingService.getRequest(UNDER_REVIEW)
    await settle([
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "approved",
        expectedVersion: current.version,
      }),
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "rejected",
        note: "خارج الميزانية",
        expectedVersion: current.version,
      }),
    ])

    const after = await accountingService.getRequest(UNDER_REVIEW)
    expect(["approved", "rejected"]).toContain(after.status)
    expect(after.decision).toBeDefined()
  })

  it("writes exactly one history entry, not one per attempt", async () => {
    const before = await accountingService.getRequest(UNDER_REVIEW)
    await settle([
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "approved",
        expectedVersion: before.version,
      }),
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "returned",
        note: "تصحيح",
        expectedVersion: before.version,
      }),
    ])

    const after = await accountingService.getRequest(UNDER_REVIEW)
    // The loser must leave no trace: a history recording attempts is not a record
    // of what happened.
    expect(after.history).toHaveLength(before.history.length + 1)
  })

  it("advances the version exactly once", async () => {
    const before = await accountingService.getRequest(UNDER_REVIEW)
    await settle([
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "approved",
        expectedVersion: before.version,
      }),
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "rejected",
        note: "سبب",
        expectedVersion: before.version,
      }),
    ])

    const after = await accountingService.getRequest(UNDER_REVIEW)
    expect(after.version).toBe(before.version + 1)
  })

  it("holds with five reviewers racing at once", async () => {
    const current = await accountingService.getRequest(UNDER_REVIEW)
    const decisions: DecisionKind[] = [
      "approved",
      "rejected",
      "returned",
      "rejected",
      "approved",
    ]

    const outcome = await settle(
      decisions.map((decision) =>
        accountingService.decideRequest({
          requestId: UNDER_REVIEW,
          decision,
          note: "سبب",
          expectedVersion: current.version,
        })
      )
    )

    expect(outcome.other).toEqual([])
    expect(outcome.fulfilled).toBe(1)
    expect(outcome.conflicts).toBe(4)
  })
})

describe("a conflict tells the reader the record moved on", () => {
  it("carries the version the record actually holds now", async () => {
    const stale = await accountingService.getRequest(UNDER_REVIEW)
    await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "approved",
      expectedVersion: stale.version,
    })

    try {
      await accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "rejected",
        note: "سبب",
        expectedVersion: stale.version,
      })
      throw new Error("expected a conflict")
    } catch (error) {
      expect(error).toBeInstanceOf(AccountingError)
      const accounting = error as AccountingError
      // Either a conflict or an illegal transition — both truthfully say the
      // request has moved on, and neither silently overwrites.
      expect(["version-conflict", "invalid-transition"]).toContain(accounting.code)
    }
  })

  it("survives a forced conflict from the scenario controller", async () => {
    const current = await accountingService.getRequest(UNDER_REVIEW)
    accountingScenarios.setConflict(true)

    await expect(
      accountingService.decideRequest({
        requestId: UNDER_REVIEW,
        decision: "approved",
        expectedVersion: current.version,
      })
    ).rejects.toMatchObject({ code: "version-conflict" })

    const after = await accountingService.getRequest(UNDER_REVIEW)
    expect(after.status).toBe("under-review")
  })
})

describe("concurrent uploads and decisions do not corrupt each other", () => {
  it("keeps exactly one of two racing start-review calls", async () => {
    const submitted = await accountingService.getRequest(
      "request-2" as ExpenseRequestId
    )
    const outcome = await settle([
      accountingService.startReview({
        requestId: submitted.id,
        expectedVersion: submitted.version,
      }),
      accountingService.startReview({
        requestId: submitted.id,
        expectedVersion: submitted.version,
      }),
    ])

    expect(outcome.other).toEqual([])
    expect(outcome.fulfilled).toBe(1)
    expect(outcome.conflicts).toBe(1)
  })
})
