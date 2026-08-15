import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import type { InvoiceId } from "@/features/student-finance/types/common"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

beforeEach(() => resetFinanceStore())

/** A fully paid invoice: completing a refund must move it off "paid". */
const PAID_STUDENT = "student-STD-2026-00001"

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

const reload = (invoiceId: InvoiceId) => studentFinanceService.getInvoice(invoiceId)

async function requestOn(invoice: InvoiceDetail, amount: string) {
  return studentFinanceService.requestRefund({
    paymentId: invoice.payments[0]!.id,
    amount,
    reason: "استرداد معتمد",
    refundDate: "2026-08-01",
  })
}

async function approve(refundId: string, invoice: InvoiceDetail) {
  return studentFinanceService.decideRefund({
    refundId: refundId as Parameters<
      typeof studentFinanceService.decideRefund
    >[0]["refundId"],
    decision: "approved",
    expectedVersion: invoice.version,
  })
}

async function complete(refundId: string, invoice: InvoiceDetail) {
  return studentFinanceService.completeRefund({
    refundId: refundId as Parameters<
      typeof studentFinanceService.completeRefund
    >[0]["refundId"],
    expectedVersion: invoice.version,
  })
}

/**
 * FR-027: money moves only when a refund completes. Every earlier state is an
 * intention, and an intention must not change a balance.
 */
describe("only a completed refund moves the balance", () => {
  it("leaves the balance untouched while merely requested", async () => {
    const invoice = await paidInvoice()
    await requestOn(invoice, "1000.00")

    const after = await reload(invoice.id)
    expect(after.derived.netPaid.amount).toBe(invoice.derived.netPaid.amount)
    expect(after.derived.remaining.amount).toBe(invoice.derived.remaining.amount)
    expect(after.derived.status).toBe(invoice.derived.status)
  })

  it("leaves the balance untouched once approved but not completed", async () => {
    const invoice = await paidInvoice()
    const refund = await requestOn(invoice, "1000.00")
    await approve(refund.id, await reload(invoice.id))

    const after = await reload(invoice.id)
    expect(after.derived.netPaid.amount).toBe(invoice.derived.netPaid.amount)
    expect(after.derived.remaining.amount).toBe(invoice.derived.remaining.amount)
  })

  it("reduces net paid and restores the outstanding balance on completion", async () => {
    const invoice = await paidInvoice()
    const paidBefore = Number(invoice.derived.netPaid.amount)

    const refund = await requestOn(invoice, "1000.00")
    await approve(refund.id, await reload(invoice.id))
    await complete(refund.id, await reload(invoice.id))

    const after = await reload(invoice.id)
    expect(Number(after.derived.netPaid.amount)).toBeCloseTo(paidBefore - 1000, 2)
    expect(Number(after.derived.remaining.amount)).toBeCloseTo(1000, 2)
  })

  it("returns the invoice status to what the balance dictates", async () => {
    const invoice = await paidInvoice()
    expect(invoice.derived.status).toBe("paid")

    const refund = await requestOn(invoice, "1000.00")
    await approve(refund.id, await reload(invoice.id))
    await complete(refund.id, await reload(invoice.id))

    // The status is derived, so it follows the money without a separate step.
    const after = await reload(invoice.id)
    expect(after.derived.status).toBe("partially-paid")
  })

  it("leaves the balance untouched when the request is rejected", async () => {
    const invoice = await paidInvoice()
    const refund = await requestOn(invoice, "1000.00")
    await studentFinanceService.decideRefund({
      refundId: refund.id,
      decision: "rejected",
      reason: "غير مبرر",
      expectedVersion: (await reload(invoice.id)).version,
    })

    const after = await reload(invoice.id)
    expect(after.derived.netPaid.amount).toBe(invoice.derived.netPaid.amount)
    expect(after.derived.status).toBe("paid")
  })

  it("shows up in the student's totals, not only on the invoice", async () => {
    const invoice = await paidInvoice()
    const before =
      await studentFinanceService.getStudentFinancialProfile(PAID_STUDENT)

    const refund = await requestOn(invoice, "1000.00")
    await approve(refund.id, await reload(invoice.id))
    await complete(refund.id, await reload(invoice.id))

    const after =
      await studentFinanceService.getStudentFinancialProfile(PAID_STUDENT)
    expect(Number(after.totals.paidAmount.amount)).toBeCloseTo(
      Number(before.totals.paidAmount.amount) - 1000,
      2
    )
    expect(Number(after.totals.remainingBalance.amount)).toBeCloseTo(
      Number(before.totals.remainingBalance.amount) + 1000,
      2
    )
  })

  it("records the completion on the financial timeline", async () => {
    const invoice = await paidInvoice()
    const refund = await requestOn(invoice, "1000.00")
    await approve(refund.id, await reload(invoice.id))
    await complete(refund.id, await reload(invoice.id))

    const timeline = await studentFinanceService.listTimeline(PAID_STUDENT, {
      limit: 500,
    })
    expect(timeline.items[0]?.category).toBe("refund-completed")
    expect(
      timeline.items.some((item) => item.category === "refund-requested")
    ).toBe(true)
  })
})

describe("balances stay coherent after a refund", () => {
  it("never lets net paid go negative", async () => {
    const invoice = await paidInvoice()
    const full = invoice.payments[0]!.amount.amount

    const refund = await requestOn(invoice, full)
    await approve(refund.id, await reload(invoice.id))
    await complete(refund.id, await reload(invoice.id))

    const after = await reload(invoice.id)
    expect(Number(after.derived.netPaid.amount)).toBeGreaterThanOrEqual(0)
  })

  it("keeps remaining equal to final minus net paid", async () => {
    const invoice = await paidInvoice()
    const refund = await requestOn(invoice, "1500.00")
    await approve(refund.id, await reload(invoice.id))
    await complete(refund.id, await reload(invoice.id))

    const after = await reload(invoice.id)
    expect(Number(after.derived.remaining.amount)).toBeCloseTo(
      Number(after.derived.finalAmount.amount) -
        Number(after.derived.netPaid.amount),
      2
    )
  })
})
