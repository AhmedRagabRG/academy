import { Injectable } from '@nestjs/common';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { ListInvoicesDto } from './dto/list-invoices.dto';
import { InvoiceService } from './invoice.service';

/** Excel refuses to read UTF-8 without this marker, and the data is Arabic. */
const UTF8_BOM = '﻿';

const HEADERS = [
  'invoiceNumber',
  'studentCode',
  'studentName',
  'branchId',
  'purpose',
  'issueDate',
  'dueDate',
  'status',
  'finalAmount',
  'netPaid',
  'remaining',
  'currency',
] as const;

/**
 * CSV is the one documented exception to the JSON response envelope. The
 * export reuses the invoice list so an exported file and the on-screen queue
 * always describe the same set.
 */
@Injectable()
export class InvoiceExportService {
  constructor(private readonly invoices: InvoiceService) {}

  async toCsv(caller: CallerContext, query: ListInvoicesDto): Promise<string> {
    // Export covers the filtered set, not one screen of it.
    const page = await this.invoices.list(caller, {
      ...query,
      page: 1,
      pageSize: 100,
    });

    const rows = (page as { items: Record<string, unknown>[] }).items ?? [];
    const lines = [HEADERS.join(',')];

    for (const row of rows) {
      lines.push(
        [
          row.invoiceNumber,
          row.studentCode,
          row.studentName,
          row.branchId,
          row.purpose ?? (row as { chargePurposeCode?: string }).chargePurposeCode,
          row.issueDate ?? '',
          row.dueDate ?? '',
          row.status,
          this.money(row.finalAmount ?? (row as { balance?: { finalAmount?: unknown } }).balance?.finalAmount),
          this.money((row as { balance?: { netPaid?: unknown } }).balance?.netPaid),
          this.money((row as { balance?: { remaining?: unknown } }).balance?.remaining),
          this.currency(row),
        ]
          .map((cell) => this.escape(cell))
          .join(','),
      );
    }

    return UTF8_BOM + lines.join('\r\n') + '\r\n';
  }

  private money(value: unknown): string {
    if (value && typeof value === 'object' && 'amount' in value) {
      return String((value as { amount: string }).amount);
    }
    return '';
  }

  private currency(row: Record<string, unknown>): string {
    const balance = row.balance as { finalAmount?: { currency?: string } };
    return balance?.finalAmount?.currency ?? '';
  }

  /**
   * A value containing a comma, quote or newline would otherwise shift every
   * later column on that row.
   */
  private escape(cell: unknown): string {
    const text = cell === null || cell === undefined ? '' : String(cell);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }
}
