import { compare, isZero, zeroMoney, type Money } from "@/shared/utils/money"
import type {
  FinancialStatus,
  InstallmentStatus,
  InvoiceStatus,
} from "../types/common"
import type { Installment, Invoice, Payment } from "../types/domain"
import type { InvoiceBalance } from "./finance-balance"
import { installmentPaid } from "./finance-balance"

/**
 * Status derivation.
 *
 * Draft, Issued, and Cancelled are *decisions* an actor makes and are stored with
 * their actor and time. Everything else here is a *consequence* of money recorded,
 * so it is derived — it can never contradict the payments that produced it
 * (research R10). `now` is always injected, never read from a hidden clock, so the
 * overdue boundary is testable.
 */

export function deriveInvoiceStatus(
  invoice: Invoice,
  balance: InvoiceBalance
): InvoiceStatus {
  if (invoice.status === "cancelled") return "cancelled"
  if (!invoice.issuedSnapshot) return "draft"

  const zero = zeroMoney(invoice.currency, invoice.precision)
  if (isZero(balance.finalAmount)) return "paid"
  if (compare(balance.remaining, zero) === 0) return "paid"
  if (compare(balance.netPaid, zero) > 0) return "partially-paid"
  return "issued"
}

export function isPastDue(dueDate: string, now: string): boolean {
  return new Date(dueDate).getTime() < new Date(now).getTime()
}

export function deriveInstallmentStatus(
  installment: Installment,
  payments: readonly Payment[],
  now: string
): InstallmentStatus {
  const paid = installmentPaid(
    installment.id,
    payments,
    installment.amount.currency,
    installment.amount.precision
  )
  const zero = zeroMoney(installment.amount.currency, installment.amount.precision)

  if (compare(paid, installment.amount) >= 0) return "paid"
  if (isPastDue(installment.dueDate, now)) return "overdue"
  if (compare(paid, zero) > 0) return "partially-paid"
  return "pending"
}

export interface StudentStatusInput {
  /** Non-cancelled invoices only. */
  invoices: readonly { invoice: Invoice; balance: InvoiceBalance }[]
  /** Every installment across those invoices with its derived status. */
  installmentStatuses: readonly InstallmentStatus[]
  remainingBalance: Money
  now: string
}

export function deriveFinancialStatus(
  input: StudentStatusInput
): FinancialStatus {
  const { invoices, installmentStatuses, remainingBalance, now } = input
  const zero = zeroMoney(remainingBalance.currency, remainingBalance.precision)

  // Overdue wins: an unpaid installment or an unpaid issued invoice past its
  // due date is the fact a finance user most needs to see.
  const hasOverdueInstallment = installmentStatuses.includes("overdue")
  const hasOverdueInvoice = invoices.some(
    ({ invoice, balance }) =>
      Boolean(invoice.issuedSnapshot) &&
      compare(balance.remaining, zero) > 0 &&
      isPastDue(invoice.dueDate, now)
  )
  if (hasOverdueInstallment || hasOverdueInvoice) return "overdue"

  if (invoices.length === 0) return "no-outstanding-balance"
  if (compare(remainingBalance, zero) === 0) return "no-outstanding-balance"
  return "partial-balance"
}

export function outstandingInstallmentCount(
  statuses: readonly InstallmentStatus[]
): number {
  return statuses.filter((status) => status !== "paid").length
}

/** An invoice accepts payment only while it is issued and not fully settled. */
export function isPayable(status: InvoiceStatus): boolean {
  return status === "issued" || status === "partially-paid"
}
