import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type FinanceRefundStatus,
  type Refund,
} from '../../../../prisma/generated/client';
import { FinanceVersionConflictException } from '../../../core/exceptions/student-finance.exceptions';
import { PrismaService } from '../../../database/prisma.service';

export interface RefundCreateInput {
  paymentId: string;
  invoiceId: string;
  organizationId: string;
  studentId: string;
  branchId: string;
  amountMinor: bigint;
  currency: string;
  precision: number;
  reason: string;
  refundDate: Date;
  requestedById: string;
  requestedByName: string;
}

export interface RefundListFilter {
  organizationId: string;
  search?: string;
  branchIds?: string[];
  statuses?: FinanceRefundStatus[];
  dateFrom?: Date;
  dateTo?: Date;
}

export type RefundSortField = 'refundDate' | 'amount';

@Injectable()
export class RefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    input: RefundCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Refund> {
    const client = tx ?? this.prisma;
    return client.refund.create({ data: { ...input, status: 'REQUESTED' } });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<Refund | null> {
    const client = tx ?? this.prisma;
    return client.refund.findUnique({ where: { id } });
  }

  /**
   * Compare-and-swap on `(id, expectedVersion)`. `updateMany` returns a count
   * rather than throwing, which is what lets a losing writer be reported as a
   * version conflict instead of silently overwriting the winner.
   */
  async updateWithVersion(
    id: string,
    expectedVersion: number,
    data: Prisma.RefundUpdateInput,
    tx: Prisma.TransactionClient,
  ): Promise<Refund> {
    const result = await tx.refund.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      const current = await tx.refund.findUnique({ where: { id } });
      throw new FinanceVersionConflictException(current?.version ?? 0);
    }
    return (await tx.refund.findUniqueOrThrow({ where: { id } })) as Refund;
  }

  async list(
    filter: RefundListFilter,
    sort: { field: RefundSortField; direction: 'asc' | 'desc' },
    paging: { skip: number; take: number },
  ): Promise<{ rows: Refund[]; total: number }> {
    const where: Prisma.RefundWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.branchIds?.length
        ? { branchId: { in: filter.branchIds } }
        : {}),
      ...(filter.statuses?.length ? { status: { in: filter.statuses } } : {}),
      ...(filter.dateFrom || filter.dateTo
        ? {
            refundDate: {
              ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
              ...(filter.dateTo ? { lte: filter.dateTo } : {}),
            },
          }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { invoice: { invoiceNumber: { contains: filter.search } } },
              { invoice: { studentCode: { contains: filter.search } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.RefundOrderByWithRelationInput =
      sort.field === 'amount'
        ? { amountMinor: sort.direction }
        : { refundDate: sort.direction };

    const [rows, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        orderBy,
        skip: paging.skip,
        take: paging.take,
      }),
      this.prisma.refund.count({ where }),
    ]);
    return { rows, total };
  }

  findByInvoiceId(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Refund[]> {
    const client = tx ?? this.prisma;
    return client.refund.findMany({
      where: { invoiceId },
      orderBy: { requestedAt: 'asc' },
    });
  }

  /**
   * Everything already claimed against one payment — requested, approved and
   * completed alike. A pending request still reserves the money, otherwise two
   * concurrent requests could each pass a check the payment cannot honour.
   */
  async sumClaimedForPayment(
    paymentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<bigint> {
    const client = tx ?? this.prisma;
    const result = await client.refund.aggregate({
      where: {
        paymentId,
        status: { in: ['REQUESTED', 'APPROVED', 'COMPLETED'] },
      },
      _sum: { amountMinor: true },
    });
    return result._sum.amountMinor ?? 0n;
  }

  /** Only completed refunds have actually moved money out. */
  async sumCompletedForInvoice(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<bigint> {
    const client = tx ?? this.prisma;
    const result = await client.refund.aggregate({
      where: { invoiceId, status: 'COMPLETED' },
      _sum: { amountMinor: true },
    });
    return result._sum.amountMinor ?? 0n;
  }
}
