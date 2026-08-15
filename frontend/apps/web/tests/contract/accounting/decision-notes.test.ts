import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type { ExpenseRequestId } from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const UNDER_REVIEW = "request-3" as ExpenseRequestId
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

const decide = async (decision: "approved" | "rejected" | "returned", note?: string) => {
  const current = await accountingService.getRequest(UNDER_REVIEW)
  return accountingService.decideRequest({
    requestId: UNDER_REVIEW,
    decision,
    note,
    expectedVersion: current.version,
  })
}

/**
 * FR-023. A negative outcome must say why: a rejection or a return with no reason
 * leaves the branch guessing what to fix, which is the whole point of returning
 * rather than rejecting.
 */
describe("a negative outcome requires a note", () => {
  for (const decision of ["rejected", "returned"] as const) {
    it(`refuses ${decision} with no note at all`, async () => {
      expect((await captureError(() => decide(decision))).code).toBe("note-required")
    })

    it(`refuses ${decision} with an empty note`, async () => {
      expect((await captureError(() => decide(decision, ""))).code).toBe(
        "note-required"
      )
    })

    it(`refuses ${decision} with a whitespace-only note`, async () => {
      expect((await captureError(() => decide(decision, "   \n\t "))).code).toBe(
        "note-required"
      )
    })

    it(`accepts ${decision} with a real note`, async () => {
      const result = await decide(decision, "سبب واضح")
      expect(result.decision?.note).toBe("سبب واضح")
    })
  }

  it("records nothing when a note is missing", async () => {
    const before = await accountingService.getRequest(UNDER_REVIEW)
    await decide("rejected").catch(() => undefined)

    const after = await accountingService.getRequest(UNDER_REVIEW)
    expect(after.status).toBe("under-review")
    expect(after.decision).toBeUndefined()
    expect(after.history).toHaveLength(before.history.length)
  })
})

describe("approval does not demand a note", () => {
  it("approves with no note", async () => {
    const result = await decide("approved")
    expect(result.status).toBe("approved")
    expect(result.decision?.note).toBeUndefined()
  })

  it("keeps an optional note when one is given", async () => {
    const result = await decide("approved", "ضمن الميزانية المعتمدة")
    expect(result.decision?.note).toBe("ضمن الميزانية المعتمدة")
  })

  it("stores a whitespace-only optional note as absent rather than as blank", async () => {
    const result = await decide("approved", "   ")
    expect(result.decision?.note).toBeUndefined()
  })
})

describe("cancellation requires a reason too", () => {
  it("refuses a cancellation with a blank reason", async () => {
    const current = await accountingService.getRequest(DRAFT)
    const error = await captureError(() =>
      accountingService.cancelRequest({
        requestId: DRAFT,
        reason: "  ",
        expectedVersion: current.version,
      })
    )
    expect(error.code).toBe("note-required")
  })

  it("records the reason on the request and in the history", async () => {
    const current = await accountingService.getRequest(DRAFT)
    const cancelled = await accountingService.cancelRequest({
      requestId: DRAFT,
      reason: "لم تعد هناك حاجة",
      expectedVersion: current.version,
    })
    expect(cancelled.cancelReason).toBe("لم تعد هناك حاجة")
    expect(cancelled.history.at(-1)!.note).toBe("لم تعد هناك حاجة")
  })
})

describe("the note requirement comes from the policy, not from a conditional", () => {
  it("carries the note into the history entry for every negative outcome", async () => {
    const returned = await decide("returned", "يحتاج مرفقًا إضافيًا")
    expect(returned.history.at(-1)!.note).toBe("يحتاج مرفقًا إضافيًا")
  })

  it("trims the note rather than storing surrounding whitespace", async () => {
    const result = await decide("rejected", "  سبب واضح  ")
    expect(result.decision?.note).toBe("سبب واضح")
  })
})
