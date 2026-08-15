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

const paging = { page: 1, pageSize: 100 }
const list = (query = {}) => accountingService.listRequests({ ...paging, ...query })

/** Seeded: request-1 and request-2 are branch-cairo; request-3 is branch-giza. */
const CAIRO_REQUEST = "request-1" as ExpenseRequestId
const GIZA_REQUEST = "request-3" as ExpenseRequestId

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

describe("the queue is limited to the acting user's branches", () => {
  it("returns only in-scope rows", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const page = await list()
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items.every((item) => item.branchId === "branch-cairo")).toBe(true)
  })

  it("can only ever narrow, never widen", async () => {
    const wide = await list()
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const scoped = await list()

    expect(scoped.total).toBeLessThan(wide.total)
    const wideIds = new Set(wide.items.map((item) => item.id))
    // No scoped read may return a row the organization-wide read did not.
    expect(scoped.items.every((item) => wideIds.has(item.id))).toBe(true)
  })

  it("cannot be widened by asking for another branch explicitly", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const page = await list({ branchIds: ["branch-giza"] })
    // A filter narrows within the scope; it is not a way out of it.
    expect(page.total).toBe(0)
  })

  it("returns an empty queue with a total of zero for a user with no branches", async () => {
    accountingScenarios.scopeToBranches([])
    const page = await list()
    expect(page.items).toEqual([])
    expect(page.total).toBe(0)
    // Zero rather than an error, which would reveal that rows exist.
    expect(page.totalPages).toBe(1)
  })
})

/** FR-048: a refusal is presented as a refusal, never as an empty result. */
describe("an out-of-scope record is refused, not hidden", () => {
  it("refuses a direct read", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const error = await captureError(() => accountingService.getRequest(GIZA_REQUEST))
    expect(error.code).toBe("out-of-scope")
  })

  it("refuses its history", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    expect(
      (await captureError(() => accountingService.listHistory(GIZA_REQUEST))).code
    ).toBe("out-of-scope")
  })

  it("refuses its comments", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    expect(
      (await captureError(() => accountingService.listComments(GIZA_REQUEST))).code
    ).toBe("out-of-scope")
  })

  it("refuses every command against it", async () => {
    const current = await accountingService.getRequest(GIZA_REQUEST)
    accountingScenarios.scopeToBranches(["branch-cairo"])

    for (const run of [
      () =>
        accountingService.submitRequest({
          requestId: GIZA_REQUEST,
          expectedVersion: current.version,
        }),
      () =>
        accountingService.decideRequest({
          requestId: GIZA_REQUEST,
          decision: "approved",
          expectedVersion: current.version,
        }),
      () =>
        accountingService.cancelRequest({
          requestId: GIZA_REQUEST,
          reason: "سبب",
          expectedVersion: current.version,
        }),
      () =>
        accountingService.addComment({ requestId: GIZA_REQUEST, body: "تعليق" }),
    ])
      expect((await captureError(run)).code).toBe("out-of-scope")
  })

  it("still allows an in-scope record", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const request = await accountingService.getRequest(CAIRO_REQUEST)
    expect(request.branchId).toBe("branch-cairo")
  })
})

describe("creating is limited to the acting user's branches too", () => {
  it("refuses a request raised for another branch", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    const error = await captureError(() =>
      accountingService.createRequest({
        input: {
          requestDate: "2026-08-01",
          branchId: "branch-giza",
          categoryId: marketing.id,
          description: "طلب",
          amount: "100.00",
        },
      })
    )
    expect(error.code).toBe("out-of-scope")
  })

  it("allows one for an authorized branch", async () => {
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const marketing = (await accountingService.listCategories(paging)).items.find(
      (item) => item.name === "التسويق"
    )!
    const created = await accountingService.createRequest({
      input: {
        requestDate: "2026-08-01",
        branchId: "branch-cairo",
        categoryId: marketing.id,
        description: "طلب",
        amount: "100.00",
      },
    })
    expect(created.branchId).toBe("branch-cairo")
  })
})

describe("organization isolation is checked before branch membership", () => {
  it("refuses a matching branch id in another organization", async () => {
    accountingScenarios.setContext({ organizationId: "organization-other" })
    // Same branch ids, different organization — still nothing.
    const page = await list()
    expect(page.total).toBe(0)
  })

  it("refuses a direct read across organizations", async () => {
    accountingScenarios.setContext({ organizationId: "organization-other" })
    expect(
      (await captureError(() => accountingService.getRequest(CAIRO_REQUEST))).code
    ).toBe("out-of-scope")
  })
})
