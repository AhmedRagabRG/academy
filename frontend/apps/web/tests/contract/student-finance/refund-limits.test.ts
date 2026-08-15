import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { FinanceError } from "@/features/student-finance/services/finance-error"
import type { PaymentSummary } from "@/features/student-finance/types/projections"

beforeEach(() => resetFinanceStore())

async function anyPayment(): Promise<PaymentSummary> {
  const page = await studentFinanceService.listPayments({ page: 1, pageSize: 200 })
  return page.items[0]!
}

/** A payment with no refunds against it yet. */
async function cleanPayment(): Promise<PaymentSummary> {
  const page = await studentFinanceService.listPayments({ page: 1, pageSize: 200 })
  const refunds = await studentFinanceService.listRefunds({ page: 1, pageSize: 200 })
  const spoken = new Set(refunds.items.map((refund) => refund.paymentId))
  return page.items.find((payment) => !spoken.has(payment.id))!
}

const request = (payment: PaymentSummary, amount: string) =>
  studentFinanceService.requestRefund({
    paymentId: payment.id,
    amount,
    reason: "طلب استرداد",
    refundDate: "2026-08-01",
  })

async function captureError(run: () => Promise<unknown>): Promise<FinanceError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof FinanceError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

describe("the refundable ceiling", () => {
  it("allows a refund up to the full payment amount", async () => {
    const payment = await cleanPayment()
    const refund = await request(payment, payment.amount.amount)
    expect(refund.amount.amount).toBe(payment.amount.amount)
  })

  it("refuses a single refund above the payment amount", async () => {
    const payment = await cleanPayment()
    const above = (Number(payment.amount.amount) + 0.01).toFixed(2)

    const error = await captureError(() => request(payment, above))
    expect(error.code).toBe("refund-exceeds-payment")
    expect(error.details.refundable).toBe(payment.amount.amount)
  })

  it("counts prior refunds against the ceiling", async () => {
    const payment = await cleanPayment()
    const half = (Number(payment.amount.amount) / 2).toFixed(2)

    await request(payment, half)
    // The second request may take the remainder, and not a penny more.
    const error = await captureError(() =>
      request(payment, (Number(half) + 0.01).toFixed(2))
    )
    expect(error.code).toBe("refund-exceeds-payment")
    expect(Number(error.details.refundable)).toBeCloseTo(Number(half), 2)
  })

  it("allows the remainder exactly", async () => {
    const payment = await cleanPayment()
    const total = Number(payment.amount.amount)
    const first = (total / 3).toFixed(2)

    await request(payment, first)
    const second = (total - Number(first)).toFixed(2)
    const refund = await request(payment, second)
    expect(refund.amount.amount).toBe(second)
  })

  it("frees the ceiling again when a request is rejected", async () => {
    const payment = await cleanPayment()
    const full = payment.amount.amount

    const first = await request(payment, full)
    await studentFinanceService.decideRefund({
      refundId: first.id,
      decision: "rejected",
      reason: "طلب غير مبرر",
      expectedVersion: await invoiceVersion(first.invoiceId),
    })

    // A rejected request never returned money, so it holds no part of the ceiling.
    const second = await request(payment, full)
    expect(second.amount.amount).toBe(full)
  })

  it("keeps an approved-but-not-yet-completed refund reserved", async () => {
    const payment = await cleanPayment()
    const full = payment.amount.amount

    const first = await request(payment, full)
    await studentFinanceService.decideRefund({
      refundId: first.id,
      decision: "approved",
      expectedVersion: await invoiceVersion(first.invoiceId),
    })

    await expect(request(payment, "0.01")).rejects.toMatchObject({
      code: "refund-exceeds-payment",
    })
  })

  it("refuses zero and negative amounts", async () => {
    const payment = await cleanPayment()
    for (const amount of ["0", "0.00", "-50.00"])
      await expect(request(payment, amount)).rejects.toBeInstanceOf(FinanceError)
  })

  it("refuses a refund against a payment that does not exist", async () => {
    const error = await captureError(() =>
      studentFinanceService.requestRefund({
        paymentId: "payment-does-not-exist" as PaymentSummary["id"],
        amount: "100.00",
        reason: "طلب استرداد",
        refundDate: "2026-08-01",
      })
    )
    expect(error.code).toBe("refund-requires-payment")
  })
})

describe("a refused request records nothing", () => {
  it("adds no refund and no timeline event", async () => {
    const payment = await anyPayment()
    const before = await studentFinanceService.listRefunds({
      page: 1,
      pageSize: 200,
    })
    const timelineBefore = await studentFinanceService.listTimeline(
      payment.studentId,
      { limit: 500 }
    )

    await request(payment, "999999.00").catch(() => undefined)

    const after = await studentFinanceService.listRefunds({ page: 1, pageSize: 200 })
    const timelineAfter = await studentFinanceService.listTimeline(
      payment.studentId,
      { limit: 500 }
    )
    expect(after.total).toBe(before.total)
    expect(timelineAfter.items.length).toBe(timelineBefore.items.length)
  })
})

async function invoiceVersion(invoiceId: string) {
  const invoice = await studentFinanceService.getInvoice(
    invoiceId as Parameters<typeof studentFinanceService.getInvoice>[0]
  )
  return invoice.version
}
