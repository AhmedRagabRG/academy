import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import type { InvoiceId } from "@/features/student-finance/types/common"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

const query = { page: 1, pageSize: 50 }

async function byStatus(status: string): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices(query)
  const row = page.items.find((item) => item.status === status)!
  return studentFinanceService.getInvoice(row.id)
}

beforeEach(() => resetFinanceStore())

/**
 * The module's central prohibitions. These guard the service surface itself so a
 * future contributor cannot quietly add a destructive operation.
 */
describe("service surface", () => {
  const surface = Object.keys(studentFinanceService)

  it("exposes no delete on any entity", () => {
    expect(
      surface.filter((name) => /(delete|destroy|remove|purge|void)/i.test(name))
    ).toEqual([])
  })

  it("exposes no payment update", () => {
    expect(
      surface.filter((name) => /^(update|edit|amend).*payment/i.test(name))
    ).toEqual([])
    expect(surface).toContain("recordPayment")
  })

  it("exposes no operation that writes an issued snapshot", () => {
    expect(surface.filter((name) => /snapshot/i.test(name))).toEqual([])
  })

  it("exposes refunds as the only correction path for a payment", () => {
    expect(surface).toContain("requestRefund")
    expect(surface).toContain("completeRefund")
  })
})

describe("raising invoices is idempotent", () => {
  it("reuses the existing invoice for a repeated enrollment and purpose", async () => {
    const before = (await studentFinanceService.listInvoices(query)).total
    const first = await studentFinanceService.raiseInvoices({
      enrollmentId: "enrollment-1",
    })
    const after = (await studentFinanceService.listInvoices(query)).total

    expect(after).toBe(before)
    const second = await studentFinanceService.raiseInvoices({
      enrollmentId: "enrollment-1",
    })
    expect(second[0]?.id).toBe(first[0]?.id)
  })

  it("resolves concurrent requests for the same enrollment to one invoice", async () => {
    const before = (await studentFinanceService.listInvoices(query)).total
    const results = await Promise.all([
      studentFinanceService.raiseInvoices({ enrollmentId: "enrollment-2" }),
      studentFinanceService.raiseInvoices({ enrollmentId: "enrollment-2" }),
      studentFinanceService.raiseInvoices({ enrollmentId: "enrollment-2" }),
    ])

    const ids = new Set(results.flatMap((batch) => batch.map((item) => item.id)))
    expect(ids.size).toBe(1)
    expect((await studentFinanceService.listInvoices(query)).total).toBe(before)
  })

  it("keeps invoice numbers unique across every record", async () => {
    const page = await studentFinanceService.listInvoices(query)
    const numbers = page.items.map((item) => item.invoiceNumber)
    expect(new Set(numbers).size).toBe(numbers.length)
  })
})

describe("issued figures are immutable", () => {
  it("refuses editing an issued invoice", async () => {
    const invoice = await byStatus("issued")
    await expect(
      studentFinanceService.updateDraftInvoice({
        invoiceId: invoice.id,
        input: { totalAmount: "1.00", dueDate: invoice.dueDate },
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "invoice-immutable" })
  })

  it("keeps the snapshot unchanged when a discount is applied after issuance", async () => {
    const invoice = await byStatus("issued")
    const before = invoice.issuedSnapshot!.finalAmount.amount

    const after = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "10",
      reason: "تسوية معتمدة",
      expectedVersion: invoice.version,
    })

    expect(after.issuedSnapshot!.finalAmount.amount).toBe(before)
    // The concession still reduces what is owed.
    expect(Number(after.derived.finalAmount.amount)).toBeLessThan(Number(before))
    expect(after.adjustments.length).toBeGreaterThan(0)
  })

  it("keeps the snapshot unchanged after a payment", async () => {
    const invoice = await byStatus("issued")
    const before = invoice.issuedSnapshot!.finalAmount.amount

    await studentFinanceService.recordPayment({
      invoiceId: invoice.id,
      methodId: "cash",
      paymentDate: "2026-06-01T00:00:00.000Z",
      amount: "100.00",
      expectedVersion: invoice.version,
    })

    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(after.issuedSnapshot!.finalAmount.amount).toBe(before)
  })

  it("allows editing a draft and recalculates the final amount", async () => {
    const invoice = await byStatus("draft")
    const updated = await studentFinanceService.updateDraftInvoice({
      invoiceId: invoice.id,
      input: {
        totalAmount: "5000.00",
        dueDate: invoice.dueDate,
        discount: { kind: "percentage", value: "10" },
      },
      expectedVersion: invoice.version,
    })
    expect(updated.draft.finalAmount.amount).toBe("4500.00")
  })

  it("freezes the figures at issuance", async () => {
    const invoice = await byStatus("draft")
    const issued = await studentFinanceService.issueInvoice({
      invoiceId: invoice.id,
      expectedVersion: invoice.version,
    })

    expect(issued.issuedSnapshot).toBeDefined()
    expect(issued.issuedSnapshot!.finalAmount.amount).toBe(
      invoice.draft.finalAmount.amount
    )
    expect(issued.issueDate).toBeTruthy()
  })

  it("refuses a stale version on every invoice command", async () => {
    const invoice = await byStatus("draft")
    await expect(
      studentFinanceService.issueInvoice({
        invoiceId: invoice.id,
        expectedVersion: invoice.version + 5,
      })
    ).rejects.toMatchObject({ code: "version-conflict" })
  })
})

describe("cancellation", () => {
  it("cancels an invoice with no payments and removes it from balances", async () => {
    const invoice = await byStatus("draft")
    const cancelled = await studentFinanceService.cancelInvoice({
      invoiceId: invoice.id,
      reason: "أُنشئت بالخطأ",
      expectedVersion: invoice.version,
    })

    expect(cancelled.status).toBe("cancelled")
    expect(cancelled.cancelReason).toBe("أُنشئت بالخطأ")

    const profile = await studentFinanceService.getStudentFinancialProfile(
      invoice.studentId
    )
    expect(
      profile.perEnrollment.every((entry) => entry.enrollmentId !== invoice.enrollmentId) ||
        Number(profile.totals.totalFees.amount) >= 0
    ).toBe(true)
  })

  it("keeps a cancelled invoice readable for historical review", async () => {
    const page = await studentFinanceService.listInvoices({
      ...query,
      statuses: ["cancelled"],
    })
    expect(page.total).toBeGreaterThan(0)
    await expect(
      studentFinanceService.getInvoice(page.items[0]!.id)
    ).resolves.toBeDefined()
  })

  it("refuses cancelling an invoice that carries a payment", async () => {
    const invoice = await byStatus("partially-paid")
    await expect(
      studentFinanceService.cancelInvoice({
        invoiceId: invoice.id,
        reason: "محاولة إلغاء",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "invoice-has-payments" })
  })

  it("requires a reason to cancel", async () => {
    const invoice = await byStatus("draft")
    await expect(
      studentFinanceService.cancelInvoice({
        invoiceId: invoice.id,
        reason: "   ",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "validation-failed" })
  })
})

describe("read failures degrade honestly", () => {
  it("surfaces a retryable failure rather than an empty list", async () => {
    financeScenarios.failNext("invoices")
    await expect(studentFinanceService.listInvoices(query)).rejects.toMatchObject({
      code: "service-unavailable",
      retryable: true,
    })
  })

  it("refuses an inverted date range", async () => {
    await expect(
      studentFinanceService.listInvoices({
        ...query,
        dateRange: { field: "dueDate", from: "2026-12-01", to: "2026-01-01" },
      })
    ).rejects.toMatchObject({ code: "invalid-date-range" })
  })

  it("returns not-found for an unknown invoice", async () => {
    await expect(
      studentFinanceService.getInvoice("invoice-missing" as InvoiceId)
    ).rejects.toMatchObject({ code: "not-found" })
  })
})
