import { Injectable } from '@nestjs/common';
import type {
  FinanceEventCategory as StoredCategory,
  Prisma,
} from '../../../../prisma/generated/client';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import type { FinanceEventCategory } from '../types/student-finance.types';
import { FinanceTimelineRepository } from './finance-timeline.repository';

/**
 * Arabic summaries for every documented category. The timeline is read by
 * finance staff, so the summary is display copy, not an event name.
 */
const SUMMARIES: Record<FinanceEventCategory, string> = {
  'invoice-created': 'تم إنشاء فاتورة',
  'invoice-issued': 'تم إصدار الفاتورة',
  'invoice-cancelled': 'تم إلغاء الفاتورة',
  'installment-plan-generated': 'تم إنشاء خطة تقسيط',
  'payment-received': 'تم استلام دفعة',
  'discount-applied': 'تم تطبيق خصم',
  'scholarship-applied': 'تم تطبيق منحة',
  'adjustment-recorded': 'تم تسجيل تسوية مالية',
  'refund-requested': 'تم طلب استرداد',
  'refund-completed': 'تم إتمام الاسترداد',
};

export const toStoredCategory = (c: FinanceEventCategory): StoredCategory =>
  c.toUpperCase().replaceAll('-', '_') as StoredCategory;

export const toWireCategory = (c: StoredCategory): FinanceEventCategory =>
  c.toLowerCase().replaceAll('_', '-') as FinanceEventCategory;

export interface TimelineItemDto {
  id: string;
  category: FinanceEventCategory;
  occurredAt: string;
  summary: string;
  invoiceId?: string;
  subjectRef?: string;
  amount?: { amount: string; currency: string; precision: number };
  actor: { id: string; name: string };
}

/**
 * One writer for the finance timeline, shared by invoices, payments,
 * reductions and refunds. Keeping it in one place is what stops each module
 * inventing its own summary wording or forgetting the sequence allocation.
 */
@Injectable()
export class FinanceTimelineService {
  constructor(private readonly repository: FinanceTimelineRepository) {}

  /** Must be called inside the same transaction as the fact it records. */
  async record(
    input: {
      organizationId: string;
      studentId: string;
      invoiceId?: string | null;
      category: FinanceEventCategory;
      actorId: string;
      actorName: string;
      subjectRef?: string | null;
      amountMinor?: bigint | null;
      currency?: string | null;
      precision?: number | null;
    },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.repository.append(
      {
        organizationId: input.organizationId,
        studentId: input.studentId,
        invoiceId: input.invoiceId ?? null,
        category: toStoredCategory(input.category),
        actorId: input.actorId,
        actorName: input.actorName,
        subjectRef: input.subjectRef ?? input.invoiceId ?? null,
        amountMinor: input.amountMinor ?? null,
        currency: input.amountMinor === undefined ? null : input.currency,
        precision: input.amountMinor === undefined ? null : input.precision,
        summary: SUMMARIES[input.category],
      },
      tx,
    );
  }

  async listForStudent(
    studentId: string,
    options: { limit: number; cursor?: string; categories?: string[] },
  ): Promise<{ items: TimelineItemDto[]; nextCursor: string | null }> {
    const cursor = options.cursor ? Number(options.cursor) : undefined;
    const categories = options.categories?.length
      ? options.categories.map((c) => toStoredCategory(c as FinanceEventCategory))
      : undefined;

    const result = await this.repository.listForStudent(studentId, {
      limit: options.limit,
      ...(Number.isFinite(cursor) ? { cursor: cursor as number } : {}),
      ...(categories ? { categories } : {}),
    });

    return {
      items: result.items.map((row) => ({
        id: row.id,
        category: toWireCategory(row.category),
        occurredAt: row.occurredAt.toISOString(),
        summary: row.summary,
        ...(row.invoiceId ? { invoiceId: row.invoiceId } : {}),
        ...(row.subjectRef ? { subjectRef: row.subjectRef } : {}),
        ...(row.amountMinor !== null &&
        row.currency !== null &&
        row.precision !== null
          ? {
              amount: fromMinorUnits(
                row.amountMinor,
                row.currency,
                row.precision,
              ),
            }
          : {}),
        actor: { id: row.actorId, name: row.actorName },
      })),
      nextCursor: result.nextCursor,
    };
  }
}
