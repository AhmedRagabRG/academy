import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { financePermissions } from "@/features/student-finance/config/finance-permissions"
import { FinanceError } from "@/features/student-finance/services/finance-error"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

beforeEach(() => resetFinanceStore())
afterEach(() => financeScenarios.reset())

const baseline = [
  financePermissions.view,
  financePermissions.invoicesView,
  financePermissions.paymentsView,
  financePermissions.timelineView,
]

async function issuedInvoice(): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices({ page: 1, pageSize: 200 })
  return studentFinanceService.getInvoice(
    page.items.find((item) => item.status === "issued")!.id
  )
}

async function captureError(run: () => Promise<unknown>): Promise<FinanceError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof FinanceError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const applyDiscount = (invoice: InvoiceDetail) =>
  studentFinanceService.applyDiscount({
    invoiceId: invoice.id,
    kind: "percentage",
    value: "5",
    reason: "خصم معتمد",
    expectedVersion: invoice.version,
  })

/**
 * Approving a discount is its own authority (spec FR-041).
 *
 * The control only means anything if the key cannot be satisfied by any adjacent
 * one — so these cases grant each neighbouring finance permission in turn and
 * assert the discount is still refused.
 */
describe("approving a discount is a distinct authority", () => {
  const neighbours = [
    financePermissions.paymentsRecord,
    financePermissions.invoicesCreate,
    financePermissions.invoicesUpdate,
    financePermissions.invoicesIssue,
    financePermissions.invoicesCancel,
    financePermissions.installmentsManage,
    financePermissions.scholarshipsApprove,
    financePermissions.refundsRecord,
    financePermissions.refundsApprove,
    financePermissions.export,
  ]

  for (const permission of neighbours) {
    it(`is refused for a user holding ${permission} but not discounts.approve`, async () => {
      const invoice = await issuedInvoice()
      financeScenarios.onlyPermissions([...baseline, permission])

      const error = await captureError(() => applyDiscount(invoice))
      expect(error.code).toBe("forbidden")
    })
  }

  it("succeeds for a user holding only the discount authority", async () => {
    const invoice = await issuedInvoice()
    financeScenarios.onlyPermissions([
      ...baseline,
      financePermissions.discountsApprove,
    ])

    const after = await applyDiscount(invoice)
    expect(after.adjustments.length).toBeGreaterThan(0)
  })

  it("does not let recording a payment double as approving a discount", async () => {
    const invoice = await issuedInvoice()
    financeScenarios.onlyPermissions([
      ...baseline,
      financePermissions.paymentsRecord,
    ])

    // The same user can take money — that authority is real, and separate.
    const methods = await studentFinanceService.lookups()
    await studentFinanceService.recordPayment({
      invoiceId: invoice.id,
      methodId: methods.paymentMethods.find((method) => method.active)!.id,
      amount: "100.00",
      paymentDate: "2026-08-01",
      expectedVersion: invoice.version,
    })

    const current = await studentFinanceService.getInvoice(invoice.id)
    const error = await captureError(() => applyDiscount(current))
    expect(error.code).toBe("forbidden")
  })
})

describe("a refused approval changes nothing", () => {
  it("records no discount, no adjustment, and no version bump", async () => {
    const invoice = await issuedInvoice()
    financeScenarios.onlyPermissions(baseline)

    await captureError(() => applyDiscount(invoice))

    financeScenarios.reset()
    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(after.discounts).toHaveLength(invoice.discounts.length)
    expect(after.adjustments).toHaveLength(invoice.adjustments.length)
    expect(after.version).toBe(invoice.version)
    expect(after.derived.finalAmount.amount).toBe(
      invoice.derived.finalAmount.amount
    )
  })

  it("writes no timeline event", async () => {
    const invoice = await issuedInvoice()
    const before = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })

    financeScenarios.onlyPermissions(baseline)
    await captureError(() => applyDiscount(invoice))
    financeScenarios.reset()

    const after = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    expect(after.items.length).toBe(before.items.length)
  })
})

describe("the projection reports the authority it enforces", () => {
  it("reports discountsApprove false when the key is absent", async () => {
    financeScenarios.onlyPermissions(baseline)
    const invoice = await issuedInvoice()
    expect(invoice.permissions.discountsApprove).toBe(false)
  })

  it("reports discountsApprove true when the key is held", async () => {
    financeScenarios.onlyPermissions([
      ...baseline,
      financePermissions.discountsApprove,
    ])
    const invoice = await issuedInvoice()
    expect(invoice.permissions.discountsApprove).toBe(true)
  })

  it("keeps scholarship approval on a separate flag", async () => {
    financeScenarios.onlyPermissions([
      ...baseline,
      financePermissions.discountsApprove,
    ])
    const invoice = await issuedInvoice()
    expect(invoice.permissions.scholarshipsApprove).toBe(false)
  })
})
