import { Injectable } from '@nestjs/common';
import type {
  FinanceEventCategory as StoredCategory,
  FinanceTimelineEvent,
  Prisma,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

export interface TimelineAppendInput {
  organizationId: string;
  studentId: string;
  invoiceId?: string | null;
  category: StoredCategory;
  actorId: string;
  actorName: string;
  subjectRef?: string | null;
  amountMinor?: bigint | null;
  currency?: string | null;
  precision?: number | null;
  summary: string;
}

/**
 * The only writer and reader of `FinanceTimelineEvent`. The table is
 * append-only at the database level (an UPDATE/DELETE trigger rejects the
 * rest), so this repository deliberately exposes no mutate or remove.
 */
@Injectable()
export class FinanceTimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Per-student monotonic ordinal, allocated inside the caller's transaction.
   * Two events written in the same millisecond still order deterministically,
   * which a timestamp alone cannot guarantee.
   */
  async nextSequence(
    studentId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const rows = await tx.$queryRaw<Array<{ next: number }>>`
      SELECT COALESCE(MAX("sequence"), 0) + 1 AS next
      FROM "FinanceTimelineEvent" WHERE "studentId" = ${studentId}::uuid
    `;
    return rows[0]?.next ?? 1;
  }

  async append(
    input: TimelineAppendInput,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const sequence = await this.nextSequence(input.studentId, tx);
    await tx.financeTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        studentId: input.studentId,
        invoiceId: input.invoiceId ?? null,
        category: input.category,
        sequence,
        actorId: input.actorId,
        actorName: input.actorName,
        subjectRef: input.subjectRef ?? null,
        amountMinor: input.amountMinor ?? null,
        currency: input.currency ?? null,
        precision: input.precision ?? null,
        summary: input.summary,
      },
    });
  }

  /**
   * Cursor paging over the per-student sequence. The cursor is the last
   * sequence seen, so a new event arriving mid-scroll cannot shift a page and
   * hide a row the way an offset would.
   */
  async listForStudent(
    studentId: string,
    options: {
      limit: number;
      cursor?: number;
      categories?: StoredCategory[];
    },
  ): Promise<{ items: FinanceTimelineEvent[]; nextCursor: string | null }> {
    const rows = await this.prisma.financeTimelineEvent.findMany({
      where: {
        studentId,
        ...(options.cursor ? { sequence: { lt: options.cursor } } : {}),
        ...(options.categories?.length
          ? { category: { in: options.categories } }
          : {}),
      },
      orderBy: { sequence: 'desc' },
      take: options.limit + 1,
    });

    const hasMore = rows.length > options.limit;
    const items = hasMore ? rows.slice(0, options.limit) : rows;
    const last = items.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? String(last.sequence) : null,
    };
  }
}
