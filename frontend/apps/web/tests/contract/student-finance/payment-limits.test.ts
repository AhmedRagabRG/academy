import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { add, makeMoney, subtract } from "@/shared/utils/money"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"
import { FinanceError } from "@/features/student-finance/services/finance-error"

/** Runs an operation expected to reject and returns the typed error. */
async function captureError(run: () => Promise<unknown>): Promise<FinanceError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof FinanceError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const query = { page: 1, pageSize: 200 }
const egp = (amount: string) => makeMoney(amount, "EGP", 2)

async function payableInvoice(): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices(query)
  const row = page.items.find(
    (item) => item.status === "issued" || item.status === "partially-paid"
  )!
  return studentFinanceService.getInvoice(row.id)
}

async function byStatus(status: string): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices(query)
  return studentFinanceService.getInvoice(
    page.items.find((item) => item.status === status)!.id
  )
}

const basePayment = {
  methodId: "cash",
  paymentDate: "2026-06-01T00:00:00.000Z",
}

beforeEach(() => resetFinanceStore())

describe("payment amount limits", () => {
  it("accepts a partial payment and reduces the balance by exactly that amount", async () => {
    const invoice = await payableInvoice()
    const before = invoice.derived.remaining

    await studentFinanceService.recordPayment({
      ...basePayment,
      invoiceId: invoice.id,
      amount: "100.00",
      expectedVersion: invoice.version,
    })

    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(after.derived.remaining.amount).toBe(subtract(before, egp("100.00")).amount)
    expect(after.derived.status).toBe("partially-paid")
  })

  it("marks the invoice paid when the remainder is settled exactly", async () => {
    const invoice = await payableInvoice()
    await studentFinanceService.recordPayment({
      ...basePayment,
      invoiceId: invoice.id,
      amount: invoice.derived.remaining.amount,
      expectedVersion: invoice.version,
    })

    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(after.derived.remaining.amount).toBe("0.00")
    expect(after.derived.status).toBe("paid")
  })

  it("refuses an amount one minor unit above the remaining balance", async () => {
    const invoice = await payableInvoice()
    const overBy = add(invoice.derived.remaining, egp("0.01"))

    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: overBy.amount,
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "payment-exceeds-balance" })
  })

  it("reports the actual remaining amount on refusal so the UI can show it", async () => {
    const invoice = await payableInvoice()
    const error = await captureError(() =>
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: "999999.00",
        expectedVersion: invoice.version,
      })
    )

    expect(error.details.remaining).toBe(invoice.derived.remaining.amount)
  })

  it("leaves no receipt, no balance change, and no status change on refusal", async () => {
    const invoice = await payableInvoice()
    const paymentsBefore = (await studentFinanceService.listPayments(query)).total

    await studentFinanceService
      .recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: "999999.00",
        expectedVersion: invoice.version,
      })
      .catch(() => undefined)

    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(after.derived.remaining.amount).toBe(invoice.derived.remaining.amount)
    expect(after.derived.status).toBe(invoice.derived.status)
    expect((await studentFinanceService.listPayments(query)).total).toBe(paymentsBefore)
  })

  it("refuses zero and negative amounts", async () => {
    const invoice = await payableInvoice()
    for (const amount of ["0.00", "-10.00"])
      await expect(
        studentFinanceService.recordPayment({
          ...basePayment,
          invoiceId: invoice.id,
          amount,
          expectedVersion: invoice.version,
        })
      ).rejects.toMatchObject({ code: "negative-amount" })
  })
})

describe("payment eligibility", () => {
  it("refuses a payment on a draft invoice", async () => {
    const invoice = await byStatus("draft")
    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: "10.00",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "invoice-not-payable" })
  })

  it("refuses a payment on a cancelled invoice", async () => {
    const invoice = await byStatus("cancelled")
    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: "10.00",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "invoice-not-payable" })
  })

  it("refuses a payment on a fully paid invoice", async () => {
    const invoice = await byStatus("paid")
    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: "10.00",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "invoice-not-payable" })
  })

  it("refuses an inactive payment method", async () => {
    const invoice = await payableInvoice()
    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        methodId: "legacy-wallet",
        amount: "10.00",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "payment-method-inactive" })
  })

  it("refuses an unknown payment method", async () => {
    const invoice = await payableInvoice()
    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        methodId: "bitcoin",
        amount: "10.00",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "validation-failed" })
  })

  it("refuses a stale version", async () => {
    const invoice = await payableInvoice()
    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: "10.00",
        expectedVersion: invoice.version + 3,
      })
    ).rejects.toMatchObject({ code: "version-conflict" })
  })
})

describe("installment attribution", () => {
  it("refuses an amount exceeding the targeted installment", async () => {
    const page = await studentFinanceService.listInvoices(query)
    const withPlan = await Promise.all(
      page.items.map((item) => studentFinanceService.getInvoice(item.id))
    ).then((all) =>
      all.find(
        (invoice) =>
          invoice.installments.length > 0 &&
          (invoice.derived.status === "issued" ||
            invoice.derived.status === "partially-paid")
      )
    )
    expect(withPlan).toBeDefined()

    const target = withPlan!.installments.find(
      (installment) => Number(installment.remaining.amount) > 0
    )!
    const overBy = add(target.remaining, egp("0.01"))

    await expect(
      studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: withPlan!.id,
        installmentId: target.id,
        amount: overBy.amount,
        expectedVersion: withPlan!.version,
      })
    ).rejects.toMatchObject({ code: "installment-exceeds-remaining" })
  })

  it("keeps invoice totals consistent with the sum of its installments", async () => {
    const page = await studentFinanceService.listInvoices(query)
    for (const row of page.items) {
      const invoice = await studentFinanceService.getInvoice(row.id)
      if (invoice.installments.length === 0) continue
      const total = invoice.installments.reduce(
        (carried, installment) => add(carried, installment.amount),
        egp("0.00")
      )
      // Installments always sum exactly to the figures they were built from.
      expect(Number(total.amount)).toBeCloseTo(
        Number(invoice.issuedSnapshot?.finalAmount.amount ?? invoice.draft.finalAmount.amount),
        2
      )
    }
  })
})

describe("receipt numbering", () => {
  it("issues a unique receipt number for every payment", async () => {
    const invoice = await payableInvoice()
    let version = invoice.version

    for (let index = 0; index < 5; index += 1) {
      await studentFinanceService.recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: "10.00",
        expectedVersion: version,
      })
      version = (await studentFinanceService.getInvoice(invoice.id)).version
    }

    const payments = await studentFinanceService.listPayments(query)
    const numbers = payments.items.map((item) => item.receiptNumber)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it("carries full receipt metadata", async () => {
    const invoice = await payableInvoice()
    const receipt = await studentFinanceService.recordPayment({
      ...basePayment,
      invoiceId: invoice.id,
      amount: "25.00",
      notes: "دفعة نقدية",
      expectedVersion: invoice.version,
    })

    expect(receipt.receiptNumber).toMatch(/^RCP-2026-\d{5}$/)
    expect(receipt.invoiceNumber).toBe(invoice.invoiceNumber)
    expect(receipt.methodLabel).toBeTruthy()
    expect(receipt.recordedByName).toBeTruthy()
    expect(receipt.amount.amount).toBe("25.00")
  })
})

describe("payments are immutable", () => {
  const surface = Object.keys(studentFinanceService)

  it("offers no way to edit or delete a recorded payment", () => {
    expect(
      surface.filter((name) => /payment/i.test(name) && /(update|edit|delete|remove)/i.test(name))
    ).toEqual([])
  })

  it("offers refunds as the correction path", () => {
    expect(surface).toContain("requestRefund")
  })
})

describe("timeline accounting", () => {
  it("adds exactly one event per successful payment", async () => {
    const invoice = await payableInvoice()
    const before = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })

    await studentFinanceService.recordPayment({
      ...basePayment,
      invoiceId: invoice.id,
      amount: "10.00",
      expectedVersion: invoice.version,
    })

    const after = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    expect(after.items.length).toBe(before.items.length + 1)
    expect(after.items[0]?.category).toBe("payment-received")
  })

  it("adds no event when a payment is refused", async () => {
    const invoice = await payableInvoice()
    const before = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })

    await studentFinanceService
      .recordPayment({
        ...basePayment,
        invoiceId: invoice.id,
        amount: "999999.00",
        expectedVersion: invoice.version,
      })
      .catch(() => undefined)

    const after = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    expect(after.items.length).toBe(before.items.length)
  })
})

describe("failure modes", () => {
  it("surfaces a retryable payment-list failure", async () => {
    financeScenarios.failNext("payments")
    await expect(studentFinanceService.listPayments(query)).rejects.toMatchObject({
      code: "service-unavailable",
      retryable: true,
    })
  })
})
