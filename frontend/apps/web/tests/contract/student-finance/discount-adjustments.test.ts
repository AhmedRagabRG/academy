import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { subtract, sum } from "@/shared/utils/money"
import { FinanceError } from "@/features/student-finance/services/finance-error"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

const query = { page: 1, pageSize: 200 }

async function captureError(run: () => Promise<unknown>): Promise<FinanceError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof FinanceError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

async function byStatus(status: string): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices(query)
  return studentFinanceService.getInvoice(
    page.items.find((item) => item.status === status)!.id
  )
}

beforeEach(() => resetFinanceStore())

/**
 * The spec's central contradiction resolved: "historical invoices never change
 * after issuance" and "reductions affect future balances" both hold, because a
 * post-issuance reduction becomes a `FinancialAdjustment` rather than an edit
 * (research R3, spec FR-007 + FR-023).
 */
describe("a discount before issuance changes the invoice's own figures", () => {
  it("recalculates the draft final amount", async () => {
    const invoice = await byStatus("draft")
    const before = invoice.draft.finalAmount

    const after = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "10",
      reason: "خصم تفوق",
      expectedVersion: invoice.version,
    })

    expect(Number(after.draft.finalAmount.amount)).toBeLessThan(Number(before.amount))
    // No adjustment is created — the invoice itself carries the reduction.
    expect(after.adjustments).toHaveLength(0)
    expect(after.discounts.length).toBeGreaterThan(0)
  })

  it("records the discount with its approval information", async () => {
    const invoice = await byStatus("draft")
    const after = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "amount",
      value: "250.00",
      reason: "تسوية تجارية",
      expectedVersion: invoice.version,
    })

    const discount = after.discounts.at(-1)!
    expect(discount.reason).toBe("تسوية تجارية")
    expect(discount.approvedBy.name).toBeTruthy()
    expect(discount.approvedAt).toBeTruthy()
  })
})

describe("a discount after issuance becomes an adjustment", () => {
  it("leaves the issued snapshot byte-for-byte unchanged", async () => {
    const invoice = await byStatus("issued")
    const snapshotBefore = JSON.stringify(invoice.issuedSnapshot)

    const after = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "10",
      reason: "تسوية بعد الإصدار",
      expectedVersion: invoice.version,
    })

    expect(JSON.stringify(after.issuedSnapshot)).toBe(snapshotBefore)
  })

  it("creates an adjustment that reduces the derived final amount", async () => {
    const invoice = await byStatus("issued")
    const after = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "10",
      reason: "تسوية بعد الإصدار",
      expectedVersion: invoice.version,
    })

    expect(after.adjustments.length).toBeGreaterThan(0)
    const reductions = sum(
      after.adjustments.map((adjustment) => adjustment.amount),
      "EGP",
      2
    )
    expect(after.derived.finalAmount.amount).toBe(
      subtract(after.issuedSnapshot!.finalAmount, reductions).amount
    )
  })

  it("reduces the remaining balance the student still owes", async () => {
    const invoice = await byStatus("issued")
    const remainingBefore = Number(invoice.derived.remaining.amount)

    const after = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "10",
      reason: "تسوية بعد الإصدار",
      expectedVersion: invoice.version,
    })

    expect(Number(after.derived.remaining.amount)).toBeLessThan(remainingBefore)
  })

  it("carries the adjustment's approver and reason", async () => {
    const invoice = await byStatus("issued")
    const after = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "amount",
      value: "100.00",
      reason: "خطأ في التسعير",
      expectedVersion: invoice.version,
    })

    const adjustment = after.adjustments.at(-1)!
    expect(adjustment.reason).toBe("خطأ في التسعير")
    expect(adjustment.approvedBy.name).toBeTruthy()
    expect(adjustment.sourceKind).toBe("discount")
  })

  it("accumulates several adjustments without rewriting history", async () => {
    let invoice = await byStatus("issued")
    const snapshot = invoice.issuedSnapshot!.finalAmount.amount

    for (const value of ["50.00", "75.00"]) {
      invoice = await studentFinanceService.applyDiscount({
        invoiceId: invoice.id,
        kind: "amount",
        value,
        reason: "تسوية",
        expectedVersion: invoice.version,
      })
    }

    expect(invoice.issuedSnapshot!.finalAmount.amount).toBe(snapshot)
    expect(invoice.adjustments).toHaveLength(2)
    expect(invoice.derived.finalAmount.amount).toBe(
      subtract(invoice.issuedSnapshot!.finalAmount, sum(
        invoice.adjustments.map((adjustment) => adjustment.amount),
        "EGP",
        2
      )).amount
    )
  })
})

describe("both floors hold", () => {
  it("refuses a discount above the configured limit", async () => {
    const invoice = await byStatus("issued")
    const error = await captureError(() =>
      studentFinanceService.applyDiscount({
        invoiceId: invoice.id,
        kind: "percentage",
        value: "80",
        reason: "خصم كبير",
        expectedVersion: invoice.version,
      })
    )
    expect(error.code).toBe("reduction-exceeds-limit")
    expect(error.details.limit).toBe("50")
  })

  it("refuses a reduction that would drop the balance below what was collected", async () => {
    // A part-paid invoice: reducing below the collected amount is not a discount,
    // it is a refund, and the error says so.
    const invoice = await byStatus("partially-paid")
    const error = await captureError(() =>
      studentFinanceService.applyDiscount({
        invoiceId: invoice.id,
        kind: "percentage",
        value: "50",
        reason: "تخفيض كبير",
        expectedVersion: invoice.version,
      })
    )

    expect(error.code).toBe("reduction-below-collected")
    expect(error.details.collected).toBeTruthy()
    expect(error.message).toContain("الاسترداد")
  })

  it("leaves the invoice untouched when a reduction is refused", async () => {
    const invoice = await byStatus("issued")
    await studentFinanceService
      .applyDiscount({
        invoiceId: invoice.id,
        kind: "percentage",
        value: "80",
        reason: "خصم كبير",
        expectedVersion: invoice.version,
      })
      .catch(() => undefined)

    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(after.adjustments).toHaveLength(invoice.adjustments.length)
    expect(after.derived.finalAmount.amount).toBe(invoice.derived.finalAmount.amount)
    expect(after.version).toBe(invoice.version)
  })

  it("never produces a negative final amount", async () => {
    const invoice = await byStatus("issued")
    const after = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "50",
      reason: "أقصى خصم",
      expectedVersion: invoice.version,
    })
    expect(Number(after.derived.finalAmount.amount)).toBeGreaterThanOrEqual(0)
  })

  it("refuses a zero or out-of-range percentage", async () => {
    const invoice = await byStatus("issued")
    for (const value of ["0", "-5", "150"])
      await expect(
        studentFinanceService.applyDiscount({
          invoiceId: invoice.id,
          kind: "percentage",
          value,
          reason: "قيمة غير صحيحة",
          expectedVersion: invoice.version,
        })
      ).rejects.toBeInstanceOf(FinanceError)
  })
})

describe("approval is a distinct authority", () => {
  it("refuses without finance.discounts.approve", async () => {
    const invoice = await byStatus("issued")
    financeScenarios.withoutPermissions(["finance.discounts.approve"])
    await expect(
      studentFinanceService.applyDiscount({
        invoiceId: invoice.id,
        kind: "percentage",
        value: "5",
        reason: "خصم",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("records nothing when approval is refused", async () => {
    const invoice = await byStatus("issued")
    financeScenarios.withoutPermissions(["finance.discounts.approve"])

    await studentFinanceService
      .applyDiscount({
        invoiceId: invoice.id,
        kind: "percentage",
        value: "5",
        reason: "خصم",
        expectedVersion: invoice.version,
      })
      .catch(() => undefined)

    financeScenarios.reset()
    const after = await studentFinanceService.getInvoice(invoice.id)
    expect(after.discounts).toHaveLength(invoice.discounts.length)
    expect(after.adjustments).toHaveLength(invoice.adjustments.length)
  })

  it("refuses a stale version", async () => {
    const invoice = await byStatus("issued")
    await expect(
      studentFinanceService.applyDiscount({
        invoiceId: invoice.id,
        kind: "percentage",
        value: "5",
        reason: "خصم",
        expectedVersion: invoice.version + 2,
      })
    ).rejects.toMatchObject({ code: "version-conflict" })
  })
})

describe("timeline accounting", () => {
  it("adds exactly one event per applied discount", async () => {
    const invoice = await byStatus("issued")
    const before = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })

    await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "5",
      reason: "خصم",
      expectedVersion: invoice.version,
    })

    const after = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    expect(after.items.length).toBe(before.items.length + 1)
    expect(["discount-applied", "adjustment-recorded"]).toContain(
      after.items[0]?.category
    )
  })

  it("adds no event when a discount is refused", async () => {
    const invoice = await byStatus("issued")
    const before = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })

    await studentFinanceService
      .applyDiscount({
        invoiceId: invoice.id,
        kind: "percentage",
        value: "80",
        reason: "خصم كبير",
        expectedVersion: invoice.version,
      })
      .catch(() => undefined)

    const after = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    expect(after.items.length).toBe(before.items.length)
  })
})
