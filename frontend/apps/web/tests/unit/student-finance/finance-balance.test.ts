import { describe, expect, it } from "vitest"
import {
  contributesToBalance,
  effectiveFigures,
  installmentPaid,
  installmentRemaining,
  invoiceBalance,
  invoiceFinal,
  netPaid,
  studentTotals,
} from "@/features/student-finance/utils/finance-balance"
import { makeMoney } from "@/shared/utils/money"
import type {
  FinancialAdjustment,
  Installment,
  Invoice,
  Payment,
  Refund,
} from "@/features/student-finance/types/domain"
import type {
  InstallmentId,
  InvoiceId,
} from "@/features/student-finance/types/common"

const egp = (amount: string) => makeMoney(amount, "EGP", 2)

const figures = (total: string, final: string) => ({
  totalAmount: egp(total),
  discountTotal: egp("0.00"),
  scholarshipTotal: egp("0.00"),
  finalAmount: egp(final),
})

const invoice = (overrides: Partial<Invoice> = {}): Invoice =>
  ({
    id: "invoice-1" as InvoiceId,
    currency: "EGP",
    precision: 2,
    status: "issued",
    dueDate: "2026-03-01T00:00:00.000Z",
    draft: figures("1000.00", "1000.00"),
    issuedSnapshot: figures("1000.00", "1000.00"),
    ...overrides,
  }) as Invoice

const payment = (amount: string, installmentId?: string): Payment =>
  ({
    id: `payment-${amount}`,
    amount: egp(amount),
    installmentId: installmentId as InstallmentId | undefined,
  }) as Payment

const refund = (amount: string, status: Refund["status"]): Refund =>
  ({ id: `refund-${amount}-${status}`, amount: egp(amount), status }) as Refund

const adjustment = (amount: string): FinancialAdjustment =>
  ({ id: `adjustment-${amount}`, amount: egp(amount) }) as FinancialAdjustment

describe("effective figures", () => {
  it("uses the frozen snapshot once issued", () => {
    const record = invoice({
      draft: figures("1000.00", "900.00"),
      issuedSnapshot: figures("1000.00", "1000.00"),
    })
    // The draft was edited after issuance in this fixture; the snapshot must win.
    expect(effectiveFigures(record).finalAmount.amount).toBe("1000.00")
  })

  it("falls back to the draft before issuance", () => {
    const record = invoice({
      status: "draft",
      issuedSnapshot: undefined,
      draft: figures("1000.00", "750.00"),
    })
    expect(effectiveFigures(record).finalAmount.amount).toBe("750.00")
  })
})

describe("invoice final amount", () => {
  it("equals the snapshot when there are no adjustments", () => {
    expect(invoiceFinal(invoice(), []).amount).toBe("1000.00")
  })

  it("subtracts post-issuance adjustments without touching the snapshot", () => {
    const record = invoice()
    expect(invoiceFinal(record, [adjustment("150.00")]).amount).toBe("850.00")
    expect(record.issuedSnapshot?.finalAmount.amount).toBe("1000.00")
  })

  it("accumulates several adjustments", () => {
    expect(
      invoiceFinal(invoice(), [adjustment("100.00"), adjustment("50.00")]).amount
    ).toBe("850.00")
  })

  it("never goes below zero", () => {
    expect(invoiceFinal(invoice(), [adjustment("5000.00")]).amount).toBe("0.00")
  })
})

describe("net paid", () => {
  it("sums payments", () => {
    expect(netPaid([payment("300.00"), payment("200.00")], [], "EGP", 2).amount).toBe("500.00")
  })

  it("counts only completed refunds", () => {
    const refunds = [
      refund("100.00", "completed"),
      refund("50.00", "requested"),
      refund("75.00", "approved"),
      refund("25.00", "rejected"),
    ]
    expect(netPaid([payment("500.00")], refunds, "EGP", 2).amount).toBe("400.00")
  })

  it("never goes negative", () => {
    expect(
      netPaid([payment("100.00")], [refund("500.00", "completed")], "EGP", 2).amount
    ).toBe("0.00")
  })

  it("is zero with no records", () => {
    expect(netPaid([], [], "EGP", 2).amount).toBe("0.00")
  })
})

describe("invoice balance", () => {
  it("reconciles final minus net paid", () => {
    const balance = invoiceBalance({
      invoice: invoice(),
      adjustments: [],
      payments: [payment("400.00")],
      refunds: [],
    })
    expect(balance.finalAmount.amount).toBe("1000.00")
    expect(balance.netPaid.amount).toBe("400.00")
    expect(balance.remaining.amount).toBe("600.00")
  })

  it("reflects an adjustment in the remaining balance", () => {
    const balance = invoiceBalance({
      invoice: invoice(),
      adjustments: [adjustment("200.00")],
      payments: [payment("400.00")],
      refunds: [],
    })
    expect(balance.finalAmount.amount).toBe("800.00")
    expect(balance.remaining.amount).toBe("400.00")
  })

  it("restores the balance when a refund completes", () => {
    const balance = invoiceBalance({
      invoice: invoice(),
      adjustments: [],
      payments: [payment("1000.00")],
      refunds: [refund("300.00", "completed")],
    })
    expect(balance.netPaid.amount).toBe("700.00")
    expect(balance.remaining.amount).toBe("300.00")
  })

  it("never reports a negative remaining balance", () => {
    const balance = invoiceBalance({
      invoice: invoice(),
      adjustments: [adjustment("900.00")],
      payments: [payment("500.00")],
      refunds: [],
    })
    expect(balance.remaining.amount).toBe("0.00")
  })

  it("holds across a long sequence of operations without drift", () => {
    const payments = Array.from({ length: 100 }, () => payment("0.01"))
    const balance = invoiceBalance({
      invoice: invoice(),
      adjustments: [],
      payments,
      refunds: [],
    })
    expect(balance.netPaid.amount).toBe("1.00")
    expect(balance.remaining.amount).toBe("999.00")
  })
})

describe("installment attribution", () => {
  const installment: Installment = {
    id: "installment-1" as InstallmentId,
    planId: "plan-1" as never,
    invoiceId: "invoice-1" as InvoiceId,
    sequence: 1,
    dueDate: "2026-03-01T00:00:00.000Z",
    amount: egp("250.00"),
  }

  it("sums only payments attributed to that installment", () => {
    const payments = [
      payment("100.00", "installment-1"),
      payment("50.00", "installment-2"),
      payment("30.00"),
    ]
    expect(installmentPaid(installment.id, payments, "EGP", 2).amount).toBe("100.00")
  })

  it("computes the remaining amount on the installment", () => {
    expect(
      installmentRemaining(installment, [payment("100.00", "installment-1")]).amount
    ).toBe("150.00")
  })

  it("never reports a negative installment remainder", () => {
    expect(
      installmentRemaining(installment, [payment("999.00", "installment-1")]).amount
    ).toBe("0.00")
  })
})

describe("student totals", () => {
  const build = (invoices: Invoice[], payments: Record<string, Payment[]> = {}) =>
    studentTotals({
      invoices,
      adjustmentsByInvoice: () => [],
      paymentsByInvoice: (id) => payments[id] ?? [],
      refundsByInvoice: () => [],
      currency: "EGP",
      precision: 2,
    })

  it("aggregates across several invoices", () => {
    const totals = build(
      [
        invoice({ id: "invoice-1" as InvoiceId }),
        invoice({
          id: "invoice-2" as InvoiceId,
          draft: figures("500.00", "500.00"),
          issuedSnapshot: figures("500.00", "500.00"),
        }),
      ],
      { "invoice-1": [payment("400.00")] }
    )
    expect(totals.totalFees.amount).toBe("1500.00")
    expect(totals.paidAmount.amount).toBe("400.00")
    expect(totals.remainingBalance.amount).toBe("1100.00")
  })

  it("excludes cancelled invoices from every total", () => {
    const totals = build([
      invoice({ id: "invoice-1" as InvoiceId }),
      invoice({ id: "invoice-2" as InvoiceId, status: "cancelled" }),
    ])
    expect(totals.totalFees.amount).toBe("1000.00")
    expect(contributesToBalance(invoice({ status: "cancelled" }))).toBe(false)
  })

  it("returns zeroes for a student with no invoices — a fact, not an absence", () => {
    const totals = build([])
    expect(totals.totalFees.amount).toBe("0.00")
    expect(totals.paidAmount.amount).toBe("0.00")
    expect(totals.remainingBalance.amount).toBe("0.00")
  })

  it("agrees with an independent sum of the records", () => {
    const invoices = Array.from({ length: 20 }, (_, index) =>
      invoice({
        id: `invoice-${index}` as InvoiceId,
        draft: figures("100.00", "99.99"),
        issuedSnapshot: figures("100.00", "99.99"),
      })
    )
    const totals = build(invoices)
    // 20 × 99.99 computed independently.
    expect(totals.totalFees.amount).toBe("1999.80")
  })
})
