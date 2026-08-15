import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import type { FinanceSequenceKind } from '../types/student-finance.types';

export interface NumberingConfig {
  invoicePrefix: string;
  receiptPrefix: string;
  width: number;
}

export const DEFAULT_NUMBERING: NumberingConfig = {
  invoicePrefix: 'INV',
  receiptPrefix: 'RCP',
  width: 5,
};

/**
 * Allocates `INV-2026-00001` / `RCP-2026-00001` from a per-organization,
 * per-year counter row.
 *
 * The counter is incremented by an atomic UPSERT inside the caller's
 * transaction. `count + 1` is not safe under concurrency and silently reuses a
 * number after a cancellation — on a financial document that is a real
 * accounting problem, not a cosmetic one.
 */
@Injectable()
export class FinanceNumberingService {
  async allocate(
    organizationId: string,
    kind: FinanceSequenceKind,
    year: number,
    tx: Prisma.TransactionClient,
    config: NumberingConfig = DEFAULT_NUMBERING,
  ): Promise<string> {
    const storedKind = kind === 'invoice' ? 'INVOICE' : 'RECEIPT';
    const rows = await tx.$queryRaw<Array<{ value: number }>>`
      INSERT INTO "FinanceNumberCounter" ("organizationId", "sequenceKind", "year", "lastValue", "updatedAt")
      VALUES (${organizationId}::uuid, ${storedKind}::"FinanceSequenceKind", ${year}, 1, NOW())
      ON CONFLICT ("organizationId", "sequenceKind", "year") DO UPDATE
      SET "lastValue" = "FinanceNumberCounter"."lastValue" + 1, "updatedAt" = NOW()
      RETURNING "lastValue" AS value
    `;
    const value = rows[0]?.value;
    if (value === undefined) {
      throw new Error('Finance number allocation failed');
    }
    const prefix =
      kind === 'invoice' ? config.invoicePrefix : config.receiptPrefix;
    return `${prefix}-${year}-${String(value).padStart(config.width, '0')}`;
  }
}
