import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

const query = { page: 1, pageSize: 200 }
const basePayment = { methodId: "cash", paymentDate: "2026-06-01T00:00:00.000Z" }

async function payableInvoice(): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices(query)
  const row = page.items.find(
    (item) => item.status === "issued" || item.status === "partially-paid"
  )!
  return studentFinanceService.getInvoice(row.id)
}

beforeEach(() => resetFinanceStore())

/**
 * The invariants under contention.
 *
 * Note what is *not* being asserted: `netPaid` is the total ever collected on the
 * invoice, which legitimately exceeds the amount that was still outstanding at the
 * start. The meaningful guards are that the balance never goes negative and that
 * collection never exceeds the invoice's final amount.
 *
 * Two mechanisms combine (research R8): `expectedVersion` rejects a write computed
 * from a stale view, and `recordPayment` re-reads the remaining balance **inside**
 * the operation rather than trusting the caller's figure.
 */
describe("concurrent collection cannot overdraw a balance", () => {
  it("admits only one of two payments computed from the same view", async () => {
    const invoice = await payableInvoice()
    const remaining = Number(invoice.derived.remaining.amount)
    // Each is individually valid; together they would exceed the balance.
    const each = (remaining * 0.7).toFixed(2)

    const results = await Promise.allSettled([
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: each,
        expectedVersion: invoice.version,
      }),
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: each,
        expectedVersion: invoice.version,
      }),
    ])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    const rejected = results.find((result) => result.status === "rejected")
    expect((rejected as PromiseRejectedResult).reason).toMatchObject({
      code: "version-conflict",
    })
  })

  it("never drives the remaining balance negative under heavy contention", async () => {
    const invoice = await payableInvoice()
    const finalAmount = Number(invoice.derived.finalAmount.amount)
    const each = (Number(invoice.derived.remaining.amount) / 3).toFixed(2)

    await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        studentFinanceService.recordPayment({
          ...basePayment,
          invoiceId: invoice.id,
          amount: each,
          expectedVersion: invoice.version,
        })
      )
    )

    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(Number(after.derived.remaining.amount)).toBeGreaterThanOrEqual(0)
    // Collection can never exceed what the invoice is actually for.
    expect(Number(after.derived.netPaid.amount)).toBeLessThanOrEqual(finalAmount)
  })

  it("holds when the service is slow, so the guard is not an artefact of speed", async () => {
    financeScenarios.setLatency(5)
    const invoice = await payableInvoice()
    const finalAmount = Number(invoice.derived.finalAmount.amount)
    const each = (Number(invoice.derived.remaining.amount) * 0.8).toFixed(2)

    await Promise.allSettled([
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: each,
        expectedVersion: invoice.version,
      }),
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: each,
        expectedVersion: invoice.version,
      }),
    ])

    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(Number(after.derived.remaining.amount)).toBeGreaterThanOrEqual(0)
    expect(Number(after.derived.netPaid.amount)).toBeLessThanOrEqual(finalAmount)
  })

  it("refuses an over-limit payment even when the version is current", async () => {
    // The version check cannot catch this: the caller is up to date but is asking
    // for more than the balance. Only the in-operation re-check refuses it.
    const invoice = await payableInvoice()
    const overBy = (Number(invoice.derived.remaining.amount) + 0.01).toFixed(2)

    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: overBy,
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "payment-exceeds-balance" })
  })

  it("refuses a further payment once sequential collection has settled the invoice", async () => {
    let invoice = await payableInvoice()
    // Pay it off in two correctly-versioned steps, then try once more.
    const half = (Number(invoice.derived.remaining.amount) / 2).toFixed(2)

    await studentFinanceService.recordPayment({
      ...basePayment,
      invoiceId: invoice.id,
      amount: half,
      expectedVersion: invoice.version,
    })
    invoice = await studentFinanceService.getInvoice(invoice.id)

    await studentFinanceService.recordPayment({
      ...basePayment,
      invoiceId: invoice.id,
      amount: invoice.derived.remaining.amount,
      expectedVersion: invoice.version,
    })
    invoice = await studentFinanceService.getInvoice(invoice.id)

    expect(invoice.derived.status).toBe("paid")
    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: "1.00",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "invoice-not-payable" })
  })

  it("issues distinct receipt numbers even when payments race", async () => {
    const invoice = await payableInvoice()
    await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        studentFinanceService.recordPayment({
          ...basePayment,
          invoiceId: invoice.id,
          amount: "5.00",
          expectedVersion: invoice.version,
        })
      )
    )

    const payments = await studentFinanceService.listPayments(query)
    const numbers = payments.items.map((item) => item.receiptNumber)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it("records exactly one timeline event per payment that actually landed", async () => {
    const invoice = await payableInvoice()
    const before = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })

    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        studentFinanceService.recordPayment({
          ...basePayment,
          invoiceId: invoice.id,
          amount: "5.00",
          expectedVersion: invoice.version,
        })
      )
    )
    const landed = results.filter((result) => result.status === "fulfilled").length

    const after = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    expect(after.items.length).toBe(before.items.length + landed)
  })
})
