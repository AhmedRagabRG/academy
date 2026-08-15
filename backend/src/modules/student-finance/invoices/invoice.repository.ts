import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type FinanceInvoiceStatus,
  type Invoice,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import { FinanceVersionConflictException } from '../../../core/exceptions/student-finance.exceptions';
import type { StoredInvoiceStatus } from '../types/student-finance.types';

export const invoiceDetailInclude = {
  statusHistory: { orderBy: { occurredAt: 'asc' as const } },
  plan: {
    include: { installments: { orderBy: { sequence: 'asc' as const } } },
  },
  payments: { orderBy: { recordedAt: 'asc' as const } },
  discounts: { orderBy: { approvedAt: 'asc' as const } },
  adjustments: { orderBy: { createdAt: 'asc' as const } },
  refunds: { orderBy: { requestedAt: 'asc' as const } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceDetailRecord = Prisma.InvoiceGetPayload<{
  include: typeof invoiceDetailInclude;
}>;

export interface RaiseInvoiceData {
  organizationId: string;
  invoiceNumber: string;
  accountId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  searchName: string;
  enrollmentId: string;
  branchId: string;
  offeringId: string;
  offeringLabel: string;
  offeringKind:
    'PROFESSIONAL_PROGRAM' | 'PROFESSIONAL_DIPLOMA' | 'TRAINING_COURSE';
  batchId: string | null;
  batchLabel: string | null;
  chargePurposeValueId: string;
  chargePurposeCode: string;
  dueDate: Date;
  currency: string;
  precision: number;
  draftTotalMinor: bigint;
  draftDiscountTotalMinor: bigint;
  draftScholarshipTotalMinor: bigint;
  draftFinalMinor: bigint;
  actorId: string;
  actorName: string;
}

@Injectable()
export class InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDetail(
    invoiceId: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InvoiceDetailRecord | null> {
    return (tx ?? this.prisma).invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: invoiceDetailInclude,
    });
  }

  /**
   * The bare invoice row, without the detail includes.
   *
   * Callers that only need the aggregate's own columns — a version check, a
   * status guard — should not pay for the status history, plan, payments,
   * discounts, adjustments and refunds that `findDetail` joins in.
   */
  findById(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Invoice | null> {
    return (tx ?? this.prisma).invoice.findUnique({
      where: { id: invoiceId },
    });
  }

  /**
   * The branch-scoped, filtered invoice queue.
   *
   * Returns the same `invoiceDetailInclude` shape the detail read uses, so the
   * mapper's `toSummary` can be reused rather than a second projection being
   * maintained alongside it.
   */
  async list(
    filter: {
      organizationId: string;
      search?: string;
      statuses?: FinanceInvoiceStatus[];
      studentId?: string;
      branchIds?: string[];
      purpose?: string;
    },
    sort: { field: string; direction: 'asc' | 'desc' },
    paging: { skip: number; take: number },
  ): Promise<{ rows: InvoiceDetailRecord[]; total: number }> {
    const where: Prisma.InvoiceWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.branchIds?.length
        ? { branchId: { in: filter.branchIds } }
        : {}),
      ...(filter.purpose ? { chargePurposeCode: filter.purpose } : {}),
      ...(filter.statuses?.length ? { status: { in: filter.statuses } } : {}),
      ...(filter.search
        ? {
            OR: [
              { searchName: { contains: filter.search } },
              { invoiceNumber: { contains: filter.search } },
              { studentCode: { contains: filter.search } },
            ],
          }
        : {}),
    };

    const orderBy = this.orderBy(sort);
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: invoiceDetailInclude,
        orderBy,
        skip: paging.skip,
        take: paging.take,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { rows, total };
  }

  private orderBy(sort: {
    field: string;
    direction: 'asc' | 'desc';
  }): Prisma.InvoiceOrderByWithRelationInput {
    const direction = sort.direction;
    switch (sort.field) {
      case 'invoiceNumber':
        return { invoiceNumber: direction };
      case 'studentName':
        return { searchName: direction };
      case 'dueDate':
        return { dueDate: direction };
      case 'issueDate':
        return { issueDate: direction };
      case 'status':
        return { status: direction };
      default:
        return { updatedAt: direction };
    }
  }

  findByEnrollmentAndPurpose(
    enrollmentId: string,
    chargePurposeValueId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).invoice.findUnique({
      where: {
        enrollmentId_chargePurposeValueId: {
          enrollmentId,
          chargePurposeValueId,
        },
      },
    });
  }

  /**
   * Idempotent raise. The unique index on `(enrollmentId, chargePurposeValueId)`
   * is the mechanism: attempt the insert, and on a unique violation resolve to
   * the row that already exists.
   *
   * A read-then-write check would let two concurrent identical requests both
   * pass the read and allocate two invoice numbers for one charge.
   */
  async raise(
    data: RaiseInvoiceData,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; created: boolean }> {
    try {
      const invoice = await tx.invoice.create({
        data: {
          organizationId: data.organizationId,
          invoiceNumber: data.invoiceNumber,
          accountId: data.accountId,
          studentId: data.studentId,
          studentCode: data.studentCode,
          studentName: data.studentName,
          searchName: data.searchName,
          enrollmentId: data.enrollmentId,
          branchId: data.branchId,
          offeringId: data.offeringId,
          offeringLabel: data.offeringLabel,
          offeringKind: data.offeringKind,
          batchId: data.batchId,
          batchLabel: data.batchLabel,
          chargePurposeValueId: data.chargePurposeValueId,
          chargePurposeCode: data.chargePurposeCode,
          dueDate: data.dueDate,
          currency: data.currency,
          precision: data.precision,
          draftTotalMinor: data.draftTotalMinor,
          draftDiscountTotalMinor: data.draftDiscountTotalMinor,
          draftScholarshipTotalMinor: data.draftScholarshipTotalMinor,
          draftFinalMinor: data.draftFinalMinor,
          status: 'DRAFT',
          createdById: data.actorId,
          createdByName: data.actorName,
          updatedById: data.actorId,
          updatedByName: data.actorName,
        },
        select: { id: true },
      });
      await this.appendStatusChange(
        {
          invoiceId: invoice.id,
          fromStatus: null,
          toStatus: 'DRAFT',
          actorId: data.actorId,
          actorName: data.actorName,
          resultInvoiceVersion: 1,
        },
        tx,
      );
      return { id: invoice.id, created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findByEnrollmentAndPurpose(
          data.enrollmentId,
          data.chargePurposeValueId,
          tx,
        );
        if (existing) return { id: existing.id, created: false };
      }
      throw error;
    }
  }

  /**
   * Compare-and-swap on `(id, version, allowedStatus)`. A zero row count means
   * another writer moved first, which is reported as a version conflict
   * carrying the current version so the client can refresh and retry.
   */
  async updateWithVersion(
    invoiceId: string,
    expectedVersion: number,
    allowedStatuses: readonly StoredInvoiceStatus[],
    data: Prisma.InvoiceUncheckedUpdateInput,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const stored = allowedStatuses.map((status) =>
      status === 'draft'
        ? 'DRAFT'
        : status === 'issued'
          ? 'ISSUED'
          : 'CANCELLED',
    );
    const result = await tx.invoice.updateMany({
      where: {
        id: invoiceId,
        version: expectedVersion,
        status: { in: stored },
      },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      const current = await tx.invoice.findUnique({
        where: { id: invoiceId },
        select: { version: true },
      });
      throw new FinanceVersionConflictException(current?.version ?? 0);
    }
    return expectedVersion + 1;
  }

  /**
   * Bumped by payments and reductions too, not only direct column edits: both
   * change the derived balance the caller last read, so optimistic
   * concurrency has to cover them or two staff can double-collect against the
   * same remaining amount.
   */
  async touchVersion(
    invoiceId: string,
    expectedVersion: number,
    actorId: string,
    actorName: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    return this.updateWithVersion(
      invoiceId,
      expectedVersion,
      ['issued'],
      { updatedById: actorId, updatedByName: actorName },
      tx,
    );
  }

  appendStatusChange(
    input: {
      invoiceId: string;
      fromStatus: 'DRAFT' | 'ISSUED' | 'CANCELLED' | null;
      toStatus: 'DRAFT' | 'ISSUED' | 'CANCELLED';
      reason?: string;
      actorId: string;
      actorName: string;
      resultInvoiceVersion: number;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.invoiceStatusChange.create({
      data: {
        invoiceId: input.invoiceId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        reason: input.reason,
        actorId: input.actorId,
        actorName: input.actorName,
        resultInvoiceVersion: input.resultInvoiceVersion,
      },
    });
  }

  /** Per-student monotonic sequence, allocated in the same transaction. */
  async nextTimelineSequence(
    studentId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const rows = await tx.$queryRaw<Array<{ next: number }>>`
      SELECT COALESCE(MAX("sequence"), 0) + 1 AS next
      FROM "FinanceTimelineEvent" WHERE "studentId" = ${studentId}::uuid
    `;
    return rows[0]?.next ?? 1;
  }
}
