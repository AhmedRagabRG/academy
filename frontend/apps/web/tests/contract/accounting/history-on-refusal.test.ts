import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"
import type {
  ExpenseCategoryId,
  ExpenseRequestId,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const DRAFT = "request-1" as ExpenseRequestId
const SUBMITTED = "request-2" as ExpenseRequestId
const UNDER_REVIEW = "request-3" as ExpenseRequestId
const PAID = "request-7" as ExpenseRequestId

const historyLength = async (id: ExpenseRequestId) => {
  accountingScenarios.reset()
  return (await accountingService.listHistory(id)).length
}

/**
 * The second half of FR-034, and the harder one to keep true: a refused command
 * must leave no trace at all. Every kind of refusal is covered, because each takes
 * a different path through the guards.
 */
describe("no history entry for any kind of refusal", () => {
  const refusals: {
    name: string
    id: ExpenseRequestId
    run: (version: number) => Promise<unknown>
    setup?: () => void
  }[] = [
    {
      name: "a stale version",
      id: DRAFT,
      run: (version) =>
        accountingService.submitRequest({
          requestId: DRAFT,
          expectedVersion: version + 5,
        }),
    },
    {
      name: "a missing permission",
      id: DRAFT,
      setup: () =>
        accountingScenarios.withoutPermissions([
          accountingPermissions.requestsSubmit,
        ]),
      run: (version) =>
        accountingService.submitRequest({ requestId: DRAFT, expectedVersion: version }),
    },
    {
      name: "an out-of-scope branch",
      id: DRAFT,
      setup: () => accountingScenarios.scopeToBranches(["branch-giza"]),
      run: (version) =>
        accountingService.submitRequest({ requestId: DRAFT, expectedVersion: version }),
    },
    {
      name: "an illegal transition",
      id: PAID,
      run: (version) =>
        accountingService.submitRequest({ requestId: PAID, expectedVersion: version }),
    },
    {
      name: "a missing note on a rejection",
      id: UNDER_REVIEW,
      run: (version) =>
        accountingService.decideRequest({
          requestId: UNDER_REVIEW,
          decision: "rejected",
          expectedVersion: version,
        }),
    },
    {
      name: "a decision on an unclaimed request",
      id: SUBMITTED,
      run: (version) =>
        accountingService.decideRequest({
          requestId: SUBMITTED,
          decision: "approved",
          expectedVersion: version,
        }),
    },
    {
      name: "an invalid field on an edit",
      id: DRAFT,
      run: async (version) => {
        const current = await accountingService.getRequest(DRAFT)
        return accountingService.updateRequest({
          requestId: DRAFT,
          input: {
            requestDate: current.requestDate,
            branchId: current.branchId,
            categoryId: current.categoryId as ExpenseCategoryId,
            description: current.description,
            amount: "0",
          },
          expectedVersion: version,
        })
      },
    },
    {
      name: "a cancellation with no reason",
      id: DRAFT,
      run: (version) =>
        accountingService.cancelRequest({
          requestId: DRAFT,
          reason: "   ",
          expectedVersion: version,
        }),
    },
  ]

  for (const { name, id, run, setup } of refusals) {
    it(`writes nothing for ${name}`, async () => {
      const before = await historyLength(id)
      const current = await accountingService.getRequest(id)

      setup?.()
      await run(current.version).catch(() => undefined)
      accountingScenarios.reset()

      expect(await historyLength(id)).toBe(before)
    })
  }
})

describe("a refusal leaves the request itself untouched", () => {
  it("keeps the status and version after a failed submission", async () => {
    const before = await accountingService.getRequest(DRAFT)
    await accountingService
      .submitRequest({ requestId: DRAFT, expectedVersion: before.version + 9 })
      .catch(() => undefined)

    const after = await accountingService.getRequest(DRAFT)
    expect(after.status).toBe(before.status)
    expect(after.version).toBe(before.version)
  })

  it("keeps the decision absent after a failed decision", async () => {
    const before = await accountingService.getRequest(UNDER_REVIEW)
    await accountingService
      .decideRequest({
        requestId: UNDER_REVIEW,
        decision: "rejected",
        expectedVersion: before.version,
      })
      .catch(() => undefined)

    const after = await accountingService.getRequest(UNDER_REVIEW)
    expect(after.decision).toBeUndefined()
    expect(after.status).toBe("under-review")
  })
})

describe("a run of refusals leaves the history exactly as it was", () => {
  it("survives eight consecutive refused commands", async () => {
    const before = await historyLength(DRAFT)
    const current = await accountingService.getRequest(DRAFT)

    for (let index = 0; index < 8; index += 1)
      await accountingService
        .submitRequest({ requestId: DRAFT, expectedVersion: current.version + index + 3 })
        .catch(() => undefined)

    expect(await historyLength(DRAFT)).toBe(before)
  })
})
