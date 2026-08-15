import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { financePermissions } from "@/features/student-finance/config/finance-permissions"
import { FinanceError } from "@/features/student-finance/services/finance-error"
import type { RefundId } from "@/features/student-finance/types/common"
import type {
  InvoiceDetail,
  RefundSummary,
} from "@/features/student-finance/types/projections"

beforeEach(() => resetFinanceStore())
afterEach(() => financeScenarios.reset())

const PAID_STUDENT = "student-STD-2026-00001"

const baseline = [
  financePermissions.view,
  financePermissions.invoicesView,
  financePermissions.paymentsView,
  financePermissions.refundsView,
  financePermissions.timelineView,
]

async function paidInvoice(): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices({
    page: 1,
    pageSize: 200,
    studentIds: [PAID_STUDENT],
  })
  return studentFinanceService.getInvoice(
    page.items.find((item) => item.status === "paid")!.id
  )
}

async function openRequest(): Promise<{
  refund: RefundSummary
  invoice: InvoiceDetail
}> {
  const invoice = await paidInvoice()
  const refund = await studentFinanceService.requestRefund({
    paymentId: invoice.payments[0]!.id,
    amount: "1000.00",
    reason: "استرداد معتمد",
    refundDate: "2026-08-01",
  })
  return { refund, invoice: await studentFinanceService.getInvoice(invoice.id) }
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

const approve = (refundId: RefundId, expectedVersion: number) =>
  studentFinanceService.decideRefund({
    refundId,
    decision: "approved",
    expectedVersion,
  })

/** FR-046: financial records are never removed. */
describe("refunds cannot be deleted", () => {
  it("exposes no delete operation at all", () => {
    expect(
      Object.keys(studentFinanceService).filter((name) =>
        /delete|remove|destroy|purge/i.test(name)
      )
    ).toEqual([])
  })

  it("keeps a rejected refund readable in the list", async () => {
    const { refund, invoice } = await openRequest()
    await studentFinanceService.decideRefund({
      refundId: refund.id,
      decision: "rejected",
      reason: "غير مبرر",
      expectedVersion: invoice.version,
    })

    const page = await studentFinanceService.listRefunds({ page: 1, pageSize: 200 })
    const stored = page.items.find((item) => item.id === refund.id)
    expect(stored?.status).toBe("rejected")
  })

  it("keeps a completed refund permanently", async () => {
    const { refund, invoice } = await openRequest()
    await approve(refund.id, invoice.version)
    await studentFinanceService.completeRefund({
      refundId: refund.id,
      expectedVersion: (await studentFinanceService.getInvoice(invoice.id)).version,
    })

    const page = await studentFinanceService.listRefunds({ page: 1, pageSize: 200 })
    expect(page.items.find((item) => item.id === refund.id)?.status).toBe(
      "completed"
    )
  })

  it("refuses to move a completed refund anywhere else", async () => {
    const { refund, invoice } = await openRequest()
    await approve(refund.id, invoice.version)
    const current = await studentFinanceService.getInvoice(invoice.id)
    await studentFinanceService.completeRefund({
      refundId: refund.id,
      expectedVersion: current.version,
    })

    const latest = await studentFinanceService.getInvoice(invoice.id)
    await expect(approve(refund.id, latest.version)).rejects.toBeInstanceOf(
      FinanceError
    )
  })
})

/** FR-041: approving a refund is its own authority. */
describe("approval requires its own permission", () => {
  it("refuses approval for a user who may only record refunds", async () => {
    const { refund, invoice } = await openRequest()
    financeScenarios.onlyPermissions([...baseline, financePermissions.refundsRecord])

    const error = await captureError(() => approve(refund.id, invoice.version))
    expect(error.code).toBe("forbidden")
  })

  it("refuses completion for a user who may only record refunds", async () => {
    const { refund, invoice } = await openRequest()
    await approve(refund.id, invoice.version)

    const current = await studentFinanceService.getInvoice(invoice.id)
    financeScenarios.onlyPermissions([...baseline, financePermissions.refundsRecord])
    const error = await captureError(() =>
      studentFinanceService.completeRefund({
        refundId: refund.id,
        expectedVersion: current.version,
      })
    )
    expect(error.code).toBe("forbidden")
  })

  it("refuses recording a request for a user who may only approve", async () => {
    const invoice = await paidInvoice()
    financeScenarios.onlyPermissions([
      ...baseline,
      financePermissions.refundsApprove,
    ])

    const error = await captureError(() =>
      studentFinanceService.requestRefund({
        paymentId: invoice.payments[0]!.id,
        amount: "1000.00",
        reason: "استرداد",
        refundDate: "2026-08-01",
      })
    )
    expect(error.code).toBe("forbidden")
  })

  it("is not satisfied by the payment-recording permission", async () => {
    const { refund, invoice } = await openRequest()
    financeScenarios.onlyPermissions([
      ...baseline,
      financePermissions.paymentsRecord,
    ])

    const error = await captureError(() => approve(refund.id, invoice.version))
    expect(error.code).toBe("forbidden")
  })

  it("leaves the refund in its previous state when approval is refused", async () => {
    const { refund, invoice } = await openRequest()
    financeScenarios.onlyPermissions([...baseline, financePermissions.refundsRecord])
    await approve(refund.id, invoice.version).catch(() => undefined)
    financeScenarios.reset()

    const page = await studentFinanceService.listRefunds({ page: 1, pageSize: 200 })
    expect(page.items.find((item) => item.id === refund.id)?.status).toBe(
      "requested"
    )
  })
})

describe("a rejection must say why", () => {
  it("refuses a rejection with no reason", async () => {
    const { refund, invoice } = await openRequest()
    await expect(
      studentFinanceService.decideRefund({
        refundId: refund.id,
        decision: "rejected",
        expectedVersion: invoice.version,
      })
    ).rejects.toBeInstanceOf(FinanceError)
  })

  it("refuses a rejection whose reason is only whitespace", async () => {
    const { refund, invoice } = await openRequest()
    await expect(
      studentFinanceService.decideRefund({
        refundId: refund.id,
        decision: "rejected",
        reason: "   ",
        expectedVersion: invoice.version,
      })
    ).rejects.toBeInstanceOf(FinanceError)
  })
})

/**
 * The contract states every command carries `expectedVersion` against the invoice
 * aggregate. A field that is accepted and never checked is worse than no field —
 * it reads as a guarantee at the call site.
 */
describe("decisions are guarded by the invoice version", () => {
  it("refuses a decision made against a stale invoice", async () => {
    const { refund, invoice } = await openRequest()
    await expect(approve(refund.id, invoice.version + 2)).rejects.toMatchObject({
      code: "version-conflict",
    })
  })

  it("refuses a completion made against a stale invoice", async () => {
    const { refund, invoice } = await openRequest()
    await approve(refund.id, invoice.version)
    await expect(
      studentFinanceService.completeRefund({
        refundId: refund.id,
        expectedVersion: invoice.version + 5,
      })
    ).rejects.toMatchObject({ code: "version-conflict" })
  })

  it("moves the invoice version when a refund completes", async () => {
    const { refund, invoice } = await openRequest()
    await approve(refund.id, invoice.version)
    const beforeCompletion = await studentFinanceService.getInvoice(invoice.id)
    await studentFinanceService.completeRefund({
      refundId: refund.id,
      expectedVersion: beforeCompletion.version,
    })

    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(after.version).toBeGreaterThan(beforeCompletion.version)
  })

  it("refuses a decision on a refund that does not exist", async () => {
    const error = await captureError(() =>
      approve("refund-does-not-exist" as RefundId, 1)
    )
    expect(error.code).toBe("not-found")
  })
})
