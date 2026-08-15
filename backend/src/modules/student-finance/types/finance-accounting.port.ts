import type { Money } from '../../../shared/types/money';

export const FINANCE_ACCOUNTING_PORT = Symbol('FINANCE_ACCOUNTING_PORT');

/**
 * Settled facts and identities only. No student name, address, national
 * identifier or note content crosses this boundary — Accounting needs to
 * reconcile money, not to know who paid it, and keeping the surface this
 * narrow is what makes that provable by an assertion on the response shape.
 */
export interface AccountingInvoiceFact {
  id: string;
  invoiceNumber: string;
  studentId: string;
  enrollmentId: string;
  issueDate: string;
  finalAmount: Money;
  status: string;
}

export interface AccountingPaymentFact {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  methodId: string;
  paymentDate: string;
  amount: Money;
}

export interface AccountingRefundFact {
  id: string;
  paymentId: string;
  invoiceId: string;
  refundDate: string;
  amount: Money;
  status: string;
}

export interface AccountingContext {
  invoices: AccountingInvoiceFact[];
  payments: AccountingPaymentFact[];
  refunds: AccountingRefundFact[];
  asOf: string;
  currency: string;
  precision: number;
}

/**
 * Accounting never writes to Finance and Finance never depends on Accounting.
 * The two modules stay independent, as the specification requires.
 */
export interface FinanceAccountingPort {
  getAccountingContext(): Promise<AccountingContext>;
}
