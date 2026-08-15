import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type {
  ExpenseRequestId,
  ExpenseStatus,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

/** One seeded request per status. */
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

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const markPaid = async (requestId: ExpenseRequestId) => {
  const current = await accountingService.getRequest(requestId)
  return accountingService.markPaid({
    requestId,
    expectedVersion: current.version,
  })
}

describe("marking an approved request as paid", () => {
  it("moves it to Paid", async () => {
    expect((await markPaid(seeded.approved)).status).toBe("paid")
  })

  it("records when it was paid", async () => {
    const paid = await markPaid(seeded.approved)
    expect(paid.paidAt).toBeTruthy()
    expect(Number.isNaN(new Date(paid.paidAt!).getTime())).toBe(false)
  })

  it("writes exactly one history entry naming the transition", async () => {
    const before = await accountingService.getRequest(seeded.approved)
    const after = await markPaid(seeded.approved)

    expect(after.history).toHaveLength(before.history.length + 1)
    const entry = after.history.at(-1)!
    expect(entry.action).toBe("paid")
    expect(entry.fromStatus).toBe("approved")
    expect(entry.toStatus).toBe("paid")
    expect(entry.performedBy.name).toBeTruthy()
  })

  it("keeps the amount exactly as requested — there is no second figure", async () => {
    const before = await accountingService.getRequest(seeded.approved)
    const paid = await markPaid(seeded.approved)
    expect(paid.amount.amount).toBe(before.amount.amount)
    expect("approvedAmount" in paid).toBe(false)
    expect("paidAmount" in paid).toBe(false)
  })

  it("advances the version", async () => {
    const before = await accountingService.getRequest(seeded.approved)
    expect((await markPaid(seeded.approved)).version).toBe(before.version + 1)
  })
})

/** SC-006: only an Approved request may be marked Paid. */
describe("no other status can be marked paid", () => {
  for (const status of [
    "draft",
    "submitted",
    "under-review",
    "returned-for-revision",
    "rejected",
    "paid",
    "cancelled",
  ] as const) {
    it(`refuses a ${status} request`, async () => {
      const error = await captureError(() => markPaid(seeded[status]))
      expect(error.code).toBe("invalid-transition")
      expect(error.details.from).toBe(status)
      expect(error.details.to).toBe("paid")
    })
  }

  it("leaves the request untouched when refused", async () => {
    const before = await accountingService.getRequest(seeded.submitted)
    await markPaid(seeded.submitted).catch(() => undefined)

    const after = await accountingService.getRequest(seeded.submitted)
    expect(after.status).toBe("submitted")
    expect(after.paidAt).toBeUndefined()
    expect(after.version).toBe(before.version)
    expect(after.history).toHaveLength(before.history.length)
  })

  it("cannot be paid twice", async () => {
    const paid = await markPaid(seeded.approved)
    const error = await captureError(() =>
      accountingService.markPaid({
        requestId: seeded.approved,
        expectedVersion: paid.version,
      })
    )
    expect(error.code).toBe("invalid-transition")
  })
})

describe("marking paid is guarded by the version", () => {
  it("refuses a stale view", async () => {
    const current = await accountingService.getRequest(seeded.approved)
    const error = await captureError(() =>
      accountingService.markPaid({
        requestId: seeded.approved,
        expectedVersion: current.version + 3,
      })
    )
    expect(error.code).toBe("version-conflict")
  })

  it("lets exactly one of two racing calls through", async () => {
    const current = await accountingService.getRequest(seeded.approved)
    const results = await Promise.allSettled([
      accountingService.markPaid({
        requestId: seeded.approved,
        expectedVersion: current.version,
      }),
      accountingService.markPaid({
        requestId: seeded.approved,
        expectedVersion: current.version,
      }),
    ])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    const after = await accountingService.getRequest(seeded.approved)
    // One entry, not two — a second payment record would be a real accounting problem.
    expect(after.history.filter((entry) => entry.action === "paid")).toHaveLength(1)
  })
})
