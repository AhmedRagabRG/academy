import {
  add,
  clampToZero,
  compare,
  subtract,
  sum,
  zeroMoney,
  type Money,
} from "@/shared/utils/money"
import type { InstallmentId, InvoiceId } from "../types/common"
import type {
  FinancialAdjustment,
  Installment,
  Invoice,
  Payment,
  Refund,
} from "../types/domain"

/**
 * Balance derivation.
 *
 * Nothing here is stored. Every figure is computed from records on demand, so
 * there is no second source of truth that can drift out of agreement with the
 * payments and invoices that produced it (spec SC-001, research R2).
 */

/** The figures in force: the frozen snapshot once issued, otherwise the draft. */
export function effectiveFigures(invoice: Invoice) {
  return invoice.issuedSnapshot ?? invoice.draft
}

/** Final amount after post-issuance adjustments. */
export function invoiceFinal(
  invoice: Invoice,
  adjustments: readonly FinancialAdjustment[]
): Money {
  const figures = effectiveFigures(invoice)
  const reductions = sum(
    adjustments.map((adjustment) => adjustment.amount),
    invoice.currency,
    invoice.precision
  )
  return clampToZero(subtract(figures.finalAmount, reductions))
}

/** Only completed refunds reverse money (spec FR-027). */
export function completedRefunds(
  refunds: readonly Refund[]
): readonly Refund[] {
  return refunds.filter((refund) => refund.status === "completed")
}

export function netPaid(
  payments: readonly Payment[],
  refunds: readonly Refund[],
  currency: string,
  precision: number
): Money {
  const collected = sum(
    payments.map((payment) => payment.amount),
    currency,
    precision
  )
  const returned = sum(
    completedRefunds(refunds).map((refund) => refund.amount),
    currency,
    precision
  )
  return clampToZero(subtract(collected, returned))
}

export interface InvoiceBalance {
  finalAmount: Money
  netPaid: Money
  remaining: Money
  /** Gross collected, ignoring refunds — the floor a reduction may not breach. */
  collected: Money
}

export function invoiceBalance(input: {
  invoice: Invoice
  adjustments: readonly FinancialAdjustment[]
  payments: readonly Payment[]
  refunds: readonly Refund[]
}): InvoiceBalance {
  const { invoice, adjustments, payments, refunds } = input
  const { currency, precision } = invoice

  const finalAmount = invoiceFinal(invoice, adjustments)
  const paid = netPaid(payments, refunds, currency, precision)
  return {
    finalAmount,
    netPaid: paid,
    remaining: clampToZero(subtract(finalAmount, paid)),
    collected: paid,
  }
}

/** Payments attributed to one installment. */
export function installmentPaid(
  installmentId: InstallmentId,
  payments: readonly Payment[],
  currency: string,
  precision: number
): Money {
  return sum(
    payments
      .filter((payment) => payment.installmentId === installmentId)
      .map((payment) => payment.amount),
    currency,
    precision
  )
}

export function installmentRemaining(
  installment: Installment,
  payments: readonly Payment[]
): Money {
  const paid = installmentPaid(
    installment.id,
    payments,
    installment.amount.currency,
    installment.amount.precision
  )
  return clampToZero(subtract(installment.amount, paid))
}

export interface StudentTotals {
  totalFees: Money
  paidAmount: Money
  remainingBalance: Money
  currency: string
  precision: number
}

/** Cancelled invoices stop contributing to balances but remain readable (FR-009). */
export function contributesToBalance(invoice: Invoice): boolean {
  return invoice.status !== "cancelled"
}

export function studentTotals(input: {
  invoices: readonly Invoice[]
  adjustmentsByInvoice: (id: InvoiceId) => readonly FinancialAdjustment[]
  paymentsByInvoice: (id: InvoiceId) => readonly Payment[]
  refundsByInvoice: (id: InvoiceId) => readonly Refund[]
  currency: string
  precision: number
}): StudentTotals {
  const { currency, precision } = input
  let totalFees = zeroMoney(currency, precision)
  let paidAmount = zeroMoney(currency, precision)
  let remainingBalance = zeroMoney(currency, precision)

  for (const invoice of input.invoices) {
    if (!contributesToBalance(invoice)) continue
    const balance = invoiceBalance({
      invoice,
      adjustments: input.adjustmentsByInvoice(invoice.id),
      payments: input.paymentsByInvoice(invoice.id),
      refunds: input.refundsByInvoice(invoice.id),
    })
    totalFees = add(totalFees, balance.finalAmount)
    paidAmount = add(paidAmount, balance.netPaid)
    remainingBalance = add(remainingBalance, balance.remaining)
  }

  return { totalFees, paidAmount, remainingBalance, currency, precision }
}

/** How much more may be collected against this invoice right now. */
export function payableRemaining(balance: InvoiceBalance): Money {
  return balance.remaining
}

export function isFullySettled(balance: InvoiceBalance): boolean {
  return compare(balance.remaining, zeroMoney(balance.remaining.currency, balance.remaining.precision)) === 0
}
