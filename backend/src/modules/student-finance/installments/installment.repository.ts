import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type FinanceScheduleBasis,
  type Installment,
  type InstallmentPlan,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

export interface PlanCreateInput {
  invoiceId: string;
  count: number;
  scheduleBasis: FinanceScheduleBasis;
  firstDueDate: Date;
  generatedById: string;
  generatedByName: string;
}

export interface InstallmentCreateInput {
  planId: string;
  invoiceId: string;
  sequence: number;
  dueDate: Date;
  amountMinor: bigint;
}

export interface InstallmentListFilter {
  organizationId: string;
  search?: string;
  branchIds?: string[];
  dueFrom?: Date;
  dueTo?: Date;
}

export type InstallmentSortField = 'dueDate' | 'amount' | 'sequence';

export type InstallmentWithInvoice = Prisma.InstallmentGetPayload<{
  include: { invoice: true };
}>;

@Injectable()
export class InstallmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  createPlan(
    input: PlanCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<InstallmentPlan> {
    const client = tx ?? this.prisma;
    return client.installmentPlan.create({ data: input });
  }

  /**
   * `createMany` in one round trip — the rows are allocated together and must
   * land together, and a per-row loop inside a serializable transaction is
   * needless contention.
   */
  async createInstallments(
    rows: readonly InstallmentCreateInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.installment.createMany({ data: [...rows] });
    return result.count;
  }

  findPlanByInvoiceId(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InstallmentPlan | null> {
    const client = tx ?? this.prisma;
    return client.installmentPlan.findUnique({ where: { invoiceId } });
  }

  findInstallmentsByPlanId(
    planId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Installment[]> {
    const client = tx ?? this.prisma;
    return client.installment.findMany({
      where: { planId },
      orderBy: { sequence: 'asc' },
    });
  }

  /**
   * Regenerating a plan is refused once any installment carries a payment, so
   * this counts payments across the whole plan rather than one row.
   */
  async countPaymentsForPlan(
    planId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.payment.count({ where: { installment: { planId } } });
  }

  async deletePlanCascade(
    planId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    // Installments cascade from the plan; no payment references them or the
    // caller would have been refused above.
    await tx.installmentPlan.delete({ where: { id: planId } });
  }

  async list(
    filter: InstallmentListFilter,
    sort: { field: InstallmentSortField; direction: 'asc' | 'desc' },
    paging: { skip: number; take: number },
  ): Promise<{ rows: InstallmentWithInvoice[]; total: number }> {
    const where: Prisma.InstallmentWhereInput = {
      invoice: {
        organizationId: filter.organizationId,
        ...(filter.branchIds?.length
          ? { branchId: { in: filter.branchIds } }
          : {}),
        ...(filter.search
          ? {
              OR: [
                { invoiceNumber: { contains: filter.search } },
                { studentCode: { contains: filter.search } },
                { searchName: { contains: filter.search } },
              ],
            }
          : {}),
      },
      ...(filter.dueFrom || filter.dueTo
        ? {
            dueDate: {
              ...(filter.dueFrom ? { gte: filter.dueFrom } : {}),
              ...(filter.dueTo ? { lte: filter.dueTo } : {}),
            },
          }
        : {}),
    };

    const orderBy: Prisma.InstallmentOrderByWithRelationInput =
      sort.field === 'amount'
        ? { amountMinor: sort.direction }
        : sort.field === 'sequence'
          ? { sequence: sort.direction }
          : { dueDate: sort.direction };

    const [rows, total] = await Promise.all([
      this.prisma.installment.findMany({
        where,
        include: { invoice: true },
        orderBy,
        skip: paging.skip,
        take: paging.take,
      }),
      this.prisma.installment.count({ where }),
    ]);
    return { rows, total };
  }
}
