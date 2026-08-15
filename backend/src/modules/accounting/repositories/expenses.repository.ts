import { Injectable } from '@nestjs/common';
import { ExpenseRequest, Prisma } from '../../../../prisma/generated/client';
import { ExpenseVersionConflictException } from '../../../core/exceptions/accounting.exceptions';
import { PrismaService } from '../../../database/prisma.service';
import { ExpenseStatus } from '../types/expense.types';

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.ExpenseRequestCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseRequest> {
    const client = tx ?? this.prisma;
    return client.expenseRequest.create({ data });
  }

  findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseRequest | null> {
    const client = tx ?? this.prisma;
    return client.expenseRequest.findUnique({ where: { id } });
  }

  findByExpenseNumber(expenseNumber: string): Promise<ExpenseRequest | null> {
    return this.prisma.expenseRequest.findUnique({ where: { expenseNumber } });
  }

  /**
   * Compare-and-swap on `(id, version)`.
   *
   * `updateMany` returns a count rather than throwing, which is what lets a
   * losing writer be reported as a version conflict carrying the *current*
   * version. A plain `update` with version in the `where` raises an opaque
   * P2025 that cannot tell "gone" from "changed underneath you".
   */
  async updateWithVersion(
    id: string,
    expectedVersion: number,
    data: Omit<Prisma.ExpenseRequestUpdateInput, 'version'>,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseRequest> {
    const client = tx ?? this.prisma;
    const result = await client.expenseRequest.updateMany({
      where: { id, version: expectedVersion },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const current = await client.expenseRequest.findUnique({ where: { id } });
      throw new ExpenseVersionConflictException(current?.version ?? 0);
    }

    return client.expenseRequest.findUniqueOrThrow({ where: { id } });
  }

  /**
   * Archival is the only removal this module has; the row stays queryable for
   * reporting, which is why there is no delete here.
   */
  archive(
    id: string,
    expectedVersion: number,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseRequest> {
    return this.updateWithVersion(
      id,
      expectedVersion,
      { isArchived: true, status: ExpenseStatus.ARCHIVED },
      tx,
    );
  }

  async findMany(
    where: Prisma.ExpenseRequestWhereInput,
    take: number,
    skip: number,
    orderBy: Prisma.ExpenseRequestOrderByWithRelationInput = {
      createdAt: 'desc',
    },
  ): Promise<{ data: ExpenseRequest[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.expenseRequest.findMany({ where, take, skip, orderBy }),
      this.prisma.expenseRequest.count({ where }),
    ]);
    return { data, total };
  }

  /**
   * How many numbers are already issued for a date, for number allocation.
   *
   * Numbers are `EXP-{seq}-{date}`, so the sequence resets per date and the
   * matching run is the *suffix*. Counting a `EXP-{year}-` prefix instead
   * matched nothing this generator ever produces, so the count was always zero:
   * every create restarted at `001` and gave up after five collisions, capping
   * the whole system at five requests a day.
   */
  async countForDate(dateSuffix: string): Promise<number> {
    return this.prisma.expenseRequest.count({
      where: { expenseNumber: { endsWith: `-${dateSuffix}` } },
    });
  }
}
