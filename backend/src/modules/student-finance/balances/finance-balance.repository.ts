import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  FINANCE_BALANCE_BATCH_LIMIT,
  type InvoiceBalanceAggregate,
  type InvoiceBalanceRow,
  type InvoiceStatus,
  type InstallmentStatus,
} from '../types/student-finance.types';

/** Shape returned by the finance_invoice_balance view. */
/**
 * Coerces a raw SQL money column to `bigint`.
 *
 * `$queryRaw` types are declarations, not conversions: a `SUM()` over a bigint
 * column comes back as PostgreSQL `numeric`, which the driver hands over as a
 * string or Decimal — never a JS bigint, whatever the interface says. Left
 * uncoerced it flows into `sum + row.finalMinor` and concatenates instead of
 * adding, which is how the student profile came to report a total of
 * "0110000100.00" for two invoices worth 110,100.
 */
function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (value === null || value === undefined) return 0n;
  // Decimal and numeric-as-string both round-trip correctly through their
  // decimal representation; the fractional part is always empty for minor units.
  const text = String(value);
  const [whole] = text.split('.');
  return BigInt(whole === '' || whole === '-' ? 0 : whole);
}

interface RawInvoiceBalance {
  invoice_id: string;
  currency: string;
  precision: number;
  final_minor: bigint;
  collected_minor: bigint;
  refunded_minor: bigint;
  net_paid_minor: bigint;
  remaining_minor: bigint;
  derived_status: string;
  is_overdue: boolean;
}

interface RawInstallmentBalance {
  installment_id: string;
  invoice_id: string;
  sequence: number;
  amount_minor: bigint;
  paid_minor: bigint;
  remaining_minor: bigint;
  derived_status: string;
}

interface RawAggregate {
  invoiced_minor: bigint | null;
  collected_minor: bigint | null;
  outstanding_minor: bigint | null;
  unsettled_invoices: bigint | null;
  matched_invoices: bigint | null;
}

const STORED_TO_WIRE: Record<string, InvoiceStatus> = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_PAID: 'partially-paid',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

const INSTALLMENT_TO_WIRE: Record<string, InstallmentStatus> = {
  PENDING: 'pending',
  PARTIALLY_PAID: 'partially-paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
};

/**
 * The ONLY place `finance_invoice_balance` is queried. Every other read path
 * goes through the balance service, so the list, the detail, the dashboard and
 * the statement can never disagree about what a student owes.
 *
 * The view is a stored query, not stored data, so nothing here can drift from
 * the payments, reductions and refunds that produce it.
 */
@Injectable()
export class FinanceBalanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reads one invoice's balance, optionally inside a caller's transaction.
   * Payment and reduction paths MUST pass `tx` so the check happens against
   * the same snapshot the write commits under — a client-supplied balance is
   * always treated as stale.
   */
  async forInvoice(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InvoiceBalanceRow | null> {
    const client = tx ?? this.prisma;
    const rows = await client.$queryRaw<RawInvoiceBalance[]>`
      SELECT * FROM finance_invoice_balance WHERE invoice_id = ${invoiceId}::uuid
    `;
    const row = rows[0];
    return row ? this.toRow(row) : null;
  }

  /**
   * One aggregate query for a whole page. A 20-row page costs one round trip,
   * never 20.
   */
  async forInvoices(
    invoiceIds: readonly string[],
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, InvoiceBalanceRow>> {
    const ids = [...new Set(invoiceIds)].slice(0, FINANCE_BALANCE_BATCH_LIMIT);
    if (!ids.length) return new Map();
    const client = tx ?? this.prisma;
    const rows = await client.$queryRaw<RawInvoiceBalance[]>`
      SELECT * FROM finance_invoice_balance WHERE invoice_id = ANY(${ids}::uuid[])
    `;
    return new Map(rows.map((row) => [row.invoice_id, this.toRow(row)]));
  }

  async forInstallments(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RawInstallmentBalance[]> {
    const client = tx ?? this.prisma;
    return client.$queryRaw<RawInstallmentBalance[]>`
      SELECT * FROM finance_installment_balance
      WHERE invoice_id = ${invoiceId}::uuid
      ORDER BY sequence ASC
    `;
  }

  async forInstallment(
    installmentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RawInstallmentBalance | null> {
    const client = tx ?? this.prisma;
    const rows = await client.$queryRaw<RawInstallmentBalance[]>`
      SELECT * FROM finance_installment_balance
      WHERE installment_id = ${installmentId}::uuid
    `;
    return rows[0] ?? null;
  }

  /**
   * Totals over EVERY invoice matching the caller's filters and branch scope —
   * never a page. Summing a capped page and labelling it an organization-wide
   * total is the defect this method exists to prevent.
   *
   * Cancelled invoices are excluded from the four figures but still counted in
   * `matched_invoices`, because "no records at all" and "nothing outstanding"
   * are different facts.
   */
  async aggregate(
    where: Prisma.Sql,
    currency: string,
    precision: number,
  ): Promise<InvoiceBalanceAggregate> {
    const rows = await this.prisma.$queryRaw<RawAggregate[]>`
      SELECT
        SUM(b.final_minor) FILTER (WHERE b.derived_status <> 'CANCELLED')     AS invoiced_minor,
        SUM(b.net_paid_minor) FILTER (WHERE b.derived_status <> 'CANCELLED')  AS collected_minor,
        SUM(b.remaining_minor) FILTER (WHERE b.derived_status <> 'CANCELLED') AS outstanding_minor,
        COUNT(*) FILTER (
          WHERE b.derived_status IN ('ISSUED', 'PARTIALLY_PAID')
        )                                                                     AS unsettled_invoices,
        COUNT(*)                                                              AS matched_invoices
      FROM "Invoice" i
      JOIN finance_invoice_balance b ON b.invoice_id = i.id
      ${where}
    `;
    const row = rows[0];
    return {
      invoicedMinor: toBigInt(row?.invoiced_minor),
      collectedMinor: toBigInt(row?.collected_minor),
      outstandingMinor: toBigInt(row?.outstanding_minor),
      unsettledInvoices: Number(row?.unsettled_invoices ?? 0n),
      matchedInvoices: Number(row?.matched_invoices ?? 0n),
      currency,
      precision,
    };
  }

  private toRow(raw: RawInvoiceBalance): InvoiceBalanceRow {
    return {
      invoiceId: raw.invoice_id,
      finalMinor: toBigInt(raw.final_minor),
      collectedMinor: toBigInt(raw.collected_minor),
      refundedMinor: toBigInt(raw.refunded_minor),
      netPaidMinor: toBigInt(raw.net_paid_minor),
      remainingMinor: toBigInt(raw.remaining_minor),
      derivedStatus: STORED_TO_WIRE[raw.derived_status] ?? 'draft',
      isOverdue: raw.is_overdue,
      currency: raw.currency,
      precision: raw.precision,
    };
  }

  toInstallmentStatus(stored: string): InstallmentStatus {
    return INSTALLMENT_TO_WIRE[stored] ?? 'pending';
  }
}
