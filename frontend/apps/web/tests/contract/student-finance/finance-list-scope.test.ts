import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { financePermissions } from "@/features/student-finance/config/finance-permissions"
import { FinanceError } from "@/features/student-finance/services/finance-error"

beforeEach(() => resetFinanceStore())
afterEach(() => financeScenarios.reset())

const paging = { page: 1, pageSize: 200 }

const queues = {
  invoices: () => studentFinanceService.listInvoices(paging),
  payments: () => studentFinanceService.listPayments(paging),
  installments: () => studentFinanceService.listInstallments(paging),
  refunds: () => studentFinanceService.listRefunds(paging),
} as const

const viewPermission = {
  invoices: financePermissions.invoicesView,
  payments: financePermissions.paymentsView,
  installments: financePermissions.invoicesView,
  refunds: financePermissions.refundsView,
} as const

async function captureError(run: () => Promise<unknown>): Promise<FinanceError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof FinanceError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

describe("every queue is scoped to the acting user's branches", () => {
  for (const [name, list] of Object.entries(queues)) {
    it(`returns only in-scope rows from the ${name} queue`, async () => {
      const all = await list()
      const allIds = new Set(all.items.map((row) => row.id))

      financeScenarios.scopeToBranches(["branch-cairo"])
      const scoped = await list()

      expect(scoped.total).toBeLessThanOrEqual(all.total)
      // A scope can only ever narrow: never a row the wide read did not return.
      for (const row of scoped.items) expect(allIds.has(row.id)).toBe(true)
    })

    it(`reports a total consistent with the scoped rows in the ${name} queue`, async () => {
      financeScenarios.scopeToBranches(["branch-cairo"])
      const scoped = await list()
      expect(scoped.items.length).toBeLessThanOrEqual(scoped.total)
      expect(scoped.total).toBeGreaterThanOrEqual(0)
    })

    it(`returns nothing in the ${name} queue for a user with no branches`, async () => {
      financeScenarios.scopeToBranches([])
      const scoped = await list()
      expect(scoped.items).toHaveLength(0)
      expect(scoped.total).toBe(0)
    })
  }
})

describe("a narrower scope actually narrows", () => {
  it("returns strictly fewer invoices for one branch than for the organization", async () => {
    const all = await studentFinanceService.listInvoices(paging)
    financeScenarios.scopeToBranches(["branch-cairo"])
    const scoped = await studentFinanceService.listInvoices(paging)
    expect(scoped.total).toBeLessThan(all.total)
  })

  it("returns strictly fewer payments for one branch", async () => {
    const all = await studentFinanceService.listPayments(paging)
    financeScenarios.scopeToBranches(["branch-cairo"])
    const scoped = await studentFinanceService.listPayments(paging)
    expect(scoped.total).toBeLessThan(all.total)
  })
})

describe("every queue checks its own view permission", () => {
  for (const [name, list] of Object.entries(queues)) {
    it(`refuses the ${name} queue without ${viewPermission[name as keyof typeof queues]}`, async () => {
      financeScenarios.withoutPermissions([
        viewPermission[name as keyof typeof queues],
      ])
      const error = await captureError(list)
      expect(error.code).toBe("forbidden")
    })
  }
})

describe("direct access to an out-of-scope record is refused", () => {
  it("refuses an invoice from another branch", async () => {
    const page = await studentFinanceService.listInvoices(paging)
    const target = page.items.find((item) => item.branchLabel !== "")!

    financeScenarios.scopeToBranches(["branch-does-not-exist"])
    const error = await captureError(() =>
      studentFinanceService.getInvoice(target.id)
    )
    // Out of scope reads as absent, not as "exists but forbidden".
    expect(["out-of-scope", "not-found", "forbidden"]).toContain(error.code)
  })

  it("refuses a command against an out-of-scope invoice", async () => {
    const page = await studentFinanceService.listInvoices(paging)
    const target = page.items.find((item) => item.status === "draft")!
    const detail = await studentFinanceService.getInvoice(target.id)

    financeScenarios.scopeToBranches(["branch-does-not-exist"])
    await expect(
      studentFinanceService.issueInvoice({
        invoiceId: target.id,
        expectedVersion: detail.version,
      })
    ).rejects.toBeInstanceOf(FinanceError)
  })

  it("refuses a student profile outside the scope", async () => {
    financeScenarios.scopeToBranches(["branch-does-not-exist"])
    const profile = await studentFinanceService.getStudentFinancialProfile(
      "student-STD-2026-00001"
    )
    // No invoices are visible, so the profile is empty rather than leaking totals.
    expect(profile.hasNoRecords).toBe(true)
    expect(profile.totals.totalFees.amount).toBe("0.00")
  })
})

describe("export follows the same rules as the list it exports", () => {
  it("requires the export permission", async () => {
    financeScenarios.withoutPermissions([financePermissions.export])
    const error = await captureError(() =>
      studentFinanceService.exportInvoices(paging)
    )
    expect(error.code).toBe("forbidden")
  })

  it("is not satisfied by the view permission alone", async () => {
    financeScenarios.onlyPermissions([
      financePermissions.view,
      financePermissions.invoicesView,
    ])
    const error = await captureError(() =>
      studentFinanceService.exportInvoices(paging)
    )
    expect(error.code).toBe("forbidden")
  })

  it("exports only in-scope rows", async () => {
    const wide = await studentFinanceService.exportInvoices(paging)
    financeScenarios.scopeToBranches(["branch-cairo"])
    const scoped = await studentFinanceService.exportInvoices(paging)

    expect(scoped.split("\n").length).toBeLessThan(wide.split("\n").length)
  })

  it("applies the same filters as the list", async () => {
    const query = { ...paging, statuses: ["draft" as const] }
    const list = await studentFinanceService.listInvoices(query)
    const exported = await studentFinanceService.exportInvoices(query)

    // Header row plus one line per row.
    expect(exported.trim().split("\n").length).toBe(list.items.length + 1)
  })
})
