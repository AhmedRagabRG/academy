import { describe, expect, it } from "vitest"
import {
  deriveFinancialStatus,
  deriveInstallmentStatus,
  deriveInvoiceStatus,
  isPastDue,
  isPayable,
  outstandingInstallmentCount,
} from "@/features/student-finance/utils/finance-status"
import { makeMoney } from "@/shared/utils/money"
import type { Installment, Invoice, Payment } from "@/features/student-finance/types/domain"
import type { InstallmentId, InvoiceId } from "@/features/student-finance/types/common"

const egp = (amount: string) => makeMoney(amount, "EGP", 2)
const NOW = "2026-06-15T12:00:00.000Z"

const figures = (final: string) => ({
  totalAmount: egp(final),
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
    dueDate: "2026-07-01T00:00:00.000Z",
    draft: figures("1000.00"),
    issuedSnapshot: figures("1000.00"),
    ...overrides,
  }) as Invoice

const balance = (final: string, paid: string, remaining: string) => ({
  finalAmount: egp(final),
  netPaid: egp(paid),
  remaining: egp(remaining),
  collected: egp(paid),
})

describe("invoice status derivation", () => {
  it("reports draft before issuance", () => {
    expect(
      deriveInvoiceStatus(
        invoice({ status: "draft", issuedSnapshot: undefined }),
        balance("1000.00", "0.00", "1000.00")
      )
    ).toBe("draft")
  })

  it("reports issued when nothing has been collected", () => {
    expect(deriveInvoiceStatus(invoice(), balance("1000.00", "0.00", "1000.00"))).toBe("issued")
  })

  it("reports partially paid once money arrives", () => {
    expect(deriveInvoiceStatus(invoice(), balance("1000.00", "400.00", "600.00"))).toBe("partially-paid")
  })

  it("reports paid when nothing remains", () => {
    expect(deriveInvoiceStatus(invoice(), balance("1000.00", "1000.00", "0.00"))).toBe("paid")
  })

  it("reports paid when a reduction cleared the balance without any payment", () => {
    expect(deriveInvoiceStatus(invoice(), balance("0.00", "0.00", "0.00"))).toBe("paid")
  })

  it("keeps cancelled regardless of balance", () => {
    expect(
      deriveInvoiceStatus(invoice({ status: "cancelled" }), balance("1000.00", "0.00", "1000.00"))
    ).toBe("cancelled")
  })

  it("never contradicts the money recorded", () => {
    // A record claiming "issued" while fully paid must still derive to paid.
    expect(
      deriveInvoiceStatus(invoice({ status: "issued" }), balance("500.00", "500.00", "0.00"))
    ).toBe("paid")
  })
})

describe("payability", () => {
  it("accepts only issued and partially paid", () => {
    expect(isPayable("issued")).toBe(true)
    expect(isPayable("partially-paid")).toBe(true)
    expect(isPayable("draft")).toBe(false)
    expect(isPayable("paid")).toBe(false)
    expect(isPayable("cancelled")).toBe(false)
  })
})

describe("overdue boundary", () => {
  it("is not past due at the exact due instant", () => {
    expect(isPastDue(NOW, NOW)).toBe(false)
  })

  it("is past due one millisecond later", () => {
    expect(isPastDue("2026-06-15T11:59:59.999Z", NOW)).toBe(true)
  })

  it("is not past due in the future", () => {
    expect(isPastDue("2026-07-01T00:00:00.000Z", NOW)).toBe(false)
  })
})

describe("installment status derivation", () => {
  const installment = (dueDate: string, amount = "250.00"): Installment =>
    ({
      id: "installment-1" as InstallmentId,
      planId: "plan-1" as never,
      invoiceId: "invoice-1" as InvoiceId,
      sequence: 1,
      dueDate,
      amount: egp(amount),
    }) as Installment

  const payment = (amount: string): Payment =>
    ({ id: "p", amount: egp(amount), installmentId: "installment-1" as InstallmentId }) as Payment

  it("reports pending when unpaid and not yet due", () => {
    expect(deriveInstallmentStatus(installment("2026-07-01T00:00:00.000Z"), [], NOW)).toBe("pending")
  })

  it("reports partially paid when part has arrived and it is not yet due", () => {
    expect(
      deriveInstallmentStatus(installment("2026-07-01T00:00:00.000Z"), [payment("100.00")], NOW)
    ).toBe("partially-paid")
  })

  it("reports paid when fully settled", () => {
    expect(
      deriveInstallmentStatus(installment("2026-07-01T00:00:00.000Z"), [payment("250.00")], NOW)
    ).toBe("paid")
  })

  it("reports overdue when past due and not fully paid", () => {
    expect(deriveInstallmentStatus(installment("2026-05-01T00:00:00.000Z"), [], NOW)).toBe("overdue")
    expect(
      deriveInstallmentStatus(installment("2026-05-01T00:00:00.000Z"), [payment("100.00")], NOW)
    ).toBe("overdue")
  })

  it("prefers paid over overdue when a late installment was settled", () => {
    expect(
      deriveInstallmentStatus(installment("2026-05-01T00:00:00.000Z"), [payment("250.00")], NOW)
    ).toBe("paid")
  })

  it("flips to overdue exactly at the boundary, not before", () => {
    const atDue = installment(NOW)
    expect(deriveInstallmentStatus(atDue, [], NOW)).toBe("pending")
    expect(deriveInstallmentStatus(atDue, [], "2026-06-15T12:00:00.001Z")).toBe("overdue")
  })
})

describe("student financial status derivation", () => {
  const entry = (final: string, paid: string, remaining: string, dueDate = "2026-07-01T00:00:00.000Z") => ({
    invoice: invoice({ dueDate }),
    balance: balance(final, paid, remaining),
  })

  it("reports no outstanding balance for a student with no invoices", () => {
    expect(
      deriveFinancialStatus({
        invoices: [],
        installmentStatuses: [],
        remainingBalance: egp("0.00"),
        now: NOW,
      })
    ).toBe("no-outstanding-balance")
  })

  it("reports no outstanding balance when everything is settled", () => {
    expect(
      deriveFinancialStatus({
        invoices: [entry("1000.00", "1000.00", "0.00")],
        installmentStatuses: ["paid"],
        remainingBalance: egp("0.00"),
        now: NOW,
      })
    ).toBe("no-outstanding-balance")
  })

  it("reports partial balance when money is still owed but nothing is late", () => {
    expect(
      deriveFinancialStatus({
        invoices: [entry("1000.00", "400.00", "600.00")],
        installmentStatuses: ["pending"],
        remainingBalance: egp("600.00"),
        now: NOW,
      })
    ).toBe("partial-balance")
  })

  it("reports overdue when any installment is late", () => {
    expect(
      deriveFinancialStatus({
        invoices: [entry("1000.00", "400.00", "600.00")],
        installmentStatuses: ["pending", "overdue"],
        remainingBalance: egp("600.00"),
        now: NOW,
      })
    ).toBe("overdue")
  })

  it("reports overdue when an issued invoice passed its due date unpaid", () => {
    expect(
      deriveFinancialStatus({
        invoices: [entry("1000.00", "0.00", "1000.00", "2026-05-01T00:00:00.000Z")],
        installmentStatuses: [],
        remainingBalance: egp("1000.00"),
        now: NOW,
      })
    ).toBe("overdue")
  })

  it("does not report overdue for a settled invoice past its due date", () => {
    expect(
      deriveFinancialStatus({
        invoices: [entry("1000.00", "1000.00", "0.00", "2026-05-01T00:00:00.000Z")],
        installmentStatuses: ["paid"],
        remainingBalance: egp("0.00"),
        now: NOW,
      })
    ).toBe("no-outstanding-balance")
  })
})

describe("outstanding installment count", () => {
  it("counts everything that is not fully paid", () => {
    expect(
      outstandingInstallmentCount(["paid", "pending", "overdue", "partially-paid", "paid"])
    ).toBe(3)
  })

  it("is zero when all are paid", () => {
    expect(outstandingInstallmentCount(["paid", "paid"])).toBe(0)
  })
})
