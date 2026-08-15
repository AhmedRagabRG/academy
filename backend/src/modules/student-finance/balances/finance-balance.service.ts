import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import type { Money } from '../../../shared/types/money';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import {
  InvoiceNotFoundException,
  PaymentExceedsBalanceException,
  InstallmentExceedsRemainingException,
} from '../../../core/exceptions/student-finance.exceptions';
import { FinanceBalanceRepository } from './finance-balance.repository';
import type {
  DerivedInstallmentBalance,
  DerivedInvoiceBalance,
  FinancialStatus,
  InvoiceBalanceRow,
} from '../types/student-finance.types';

export interface StudentTotals {
  totalFees: Money;
  paidAmount: Money;
  remainingBalance: Money;
  outstandingInstallments: number;
  financialStatus: FinancialStatus;
  hasNoRecords: boolean;
}

/**
 * The single derivation every read path shares.
 *
 * Nothing here is stored. Final amount, collected amount, remaining balance,
 * installment progress and the partially-paid/paid statuses are all computed
 * from the records that produced them, so a reported balance can always be
 * proved by recomputation and can never drift.
 */
@Injectable()
export class FinanceBalanceService {
  constructor(private readonly repository: FinanceBalanceRepository) {}

  async forInvoice(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DerivedInvoiceBalance> {
    const row = await this.repository.forInvoice(invoiceId, tx);
    if (!row) throw new InvoiceNotFoundException();
    return this.toDerived(row);
  }

  /** The raw minor-unit row, for guards that need the underlying figures. */
  async rawForInvoice(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InvoiceBalanceRow> {
    const row = await this.repository.forInvoice(invoiceId, tx);
    if (!row) throw new InvoiceNotFoundException();
    return row;
  }

  async forInvoices(
    invoiceIds: readonly string[],
  ): Promise<Map<string, DerivedInvoiceBalance>> {
    const rows = await this.repository.forInvoices(invoiceIds);
    return new Map(
      [...rows].map(([id, row]) => [id, this.toDerived(row)] as const),
    );
  }

  /**
   * Currency and precision come from the owning invoice — an installment has
   * no currency of its own, and defaulting one here would let a non-EGP
   * organization render wrong money.
   */
  async forInstallments(
    invoiceId: string,
    currency: string,
    precision: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, DerivedInstallmentBalance>> {
    const rows = await this.repository.forInstallments(invoiceId, tx);
    return new Map(
      rows.map(
        (row) =>
          [
            row.installment_id,
            {
              paidAmount: fromMinorUnits(row.paid_minor, currency, precision),
              remaining: fromMinorUnits(
                row.remaining_minor,
                currency,
                precision,
              ),
              status: this.repository.toInstallmentStatus(row.derived_status),
            },
          ] as const,
      ),
    );
  }

  /**
   * Re-reads the remaining balance INSIDE the caller's transaction and refuses
   * anything above it. The client's figure is never trusted: it was computed
   * before this request, and another payment may have landed since.
   */
  async assertPaymentWithinBalance(
    invoiceId: string,
    amountMinor: bigint,
    tx: Prisma.TransactionClient,
  ): Promise<InvoiceBalanceRow> {
    const row = await this.repository.forInvoice(invoiceId, tx);
    if (!row) throw new InvoiceNotFoundException();
    if (amountMinor > row.remainingMinor) {
      throw new PaymentExceedsBalanceException(
        fromMinorUnits(row.remainingMinor, row.currency, row.precision).amount,
      );
    }
    return row;
  }

  async assertWithinInstallmentRemaining(
    installmentId: string,
    amountMinor: bigint,
    currency: string,
    precision: number,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const row = await this.repository.forInstallment(installmentId, tx);
    if (!row) throw new InvoiceNotFoundException();
    if (amountMinor > row.remaining_minor) {
      throw new InstallmentExceedsRemainingException(
        fromMinorUnits(row.remaining_minor, currency, precision).amount,
      );
    }
  }

  /**
   * Rolls per-invoice balances into the student-level statement figures.
   * `hasNoRecords` is set explicitly rather than reported as zeros, because
   * "this student has no invoices" and "this student owes nothing" are
   * different facts and the UI renders them differently.
   */
  summarizeStudent(
    rows: readonly InvoiceBalanceRow[],
    outstandingInstallments: number,
    currency: string,
    precision: number,
  ): StudentTotals {
    const live = rows.filter((row) => row.derivedStatus !== 'cancelled');
    const totalFees = live.reduce((sum, row) => sum + row.finalMinor, 0n);
    const paid = live.reduce((sum, row) => sum + row.netPaidMinor, 0n);
    const remaining = live.reduce((sum, row) => sum + row.remainingMinor, 0n);
    const anyOverdue = live.some((row) => row.isOverdue);

    let financialStatus: FinancialStatus;
    if (rows.length === 0) financialStatus = 'no-outstanding-balance';
    else if (remaining === 0n)
      financialStatus = totalFees > 0n ? 'completed' : 'no-outstanding-balance';
    else if (anyOverdue) financialStatus = 'overdue';
    else financialStatus = 'partial-balance';

    return {
      totalFees: fromMinorUnits(totalFees, currency, precision),
      paidAmount: fromMinorUnits(paid, currency, precision),
      remainingBalance: fromMinorUnits(remaining, currency, precision),
      outstandingInstallments,
      financialStatus,
      // Cancelled invoices still count here: a cancelled invoice is a record.
      hasNoRecords: rows.length === 0,
    };
  }

  private toDerived(row: InvoiceBalanceRow): DerivedInvoiceBalance {
    return {
      finalAmount: fromMinorUnits(row.finalMinor, row.currency, row.precision),
      netPaid: fromMinorUnits(row.netPaidMinor, row.currency, row.precision),
      remaining: fromMinorUnits(
        row.remainingMinor,
        row.currency,
        row.precision,
      ),
      status: row.derivedStatus,
      isOverdue: row.isOverdue,
    };
  }
}
