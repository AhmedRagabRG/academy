import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Discount,
  type FinanceReductionKind,
  type FinanceScholarshipCoverage,
  type FinancialAdjustment,
  type Scholarship,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

export interface DiscountCreateInput {
  invoiceId: string;
  kind: FinanceReductionKind;
  value: bigint;
  reason: string;
  approvedById: string;
  approvedByName: string;
}

export interface ScholarshipCreateInput {
  organizationId: string;
  studentId: string;
  enrollmentId?: string | null;
  name: string;
  kind: FinanceReductionKind;
  value: bigint;
  coverage: FinanceScholarshipCoverage;
  reason: string;
  approvedById: string;
  approvedByName: string;
}

export interface AdjustmentCreateInput {
  invoiceId: string;
  sourceKind: 'DISCOUNT' | 'SCHOLARSHIP';
  sourceId: string;
  amountMinor: bigint;
  currency: string;
  precision: number;
  reason: string;
  approvedById: string;
  approvedByName: string;
}

/**
 * All three tables are append-only at the database level. There is
 * deliberately no update or delete here: a reduction is corrected by
 * recording another adjustment, never by rewriting history.
 */
@Injectable()
export class ReductionRepository {
  constructor(private readonly prisma: PrismaService) {}

  createDiscount(
    input: DiscountCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Discount> {
    const client = tx ?? this.prisma;
    return client.discount.create({ data: input });
  }

  createScholarship(
    input: ScholarshipCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Scholarship> {
    const client = tx ?? this.prisma;
    return client.scholarship.create({
      data: { ...input, enrollmentId: input.enrollmentId ?? null },
    });
  }

  /**
   * The post-issuance record of a reduction's monetary effect. An issued
   * invoice's figures are frozen, so the reduction lands here rather than
   * rewriting the issued snapshot.
   */
  createAdjustment(
    input: AdjustmentCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<FinancialAdjustment> {
    const client = tx ?? this.prisma;
    return client.financialAdjustment.create({ data: input });
  }

  findDiscountsByInvoiceId(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Discount[]> {
    const client = tx ?? this.prisma;
    return client.discount.findMany({
      where: { invoiceId },
      orderBy: { approvedAt: 'asc' },
    });
  }

  findScholarshipsForStudent(
    studentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Scholarship[]> {
    const client = tx ?? this.prisma;
    return client.scholarship.findMany({
      where: { studentId },
      orderBy: { approvedAt: 'asc' },
    });
  }

  findAdjustmentsByInvoiceId(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FinancialAdjustment[]> {
    const client = tx ?? this.prisma;
    return client.financialAdjustment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sumAdjustmentsForInvoice(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<bigint> {
    const client = tx ?? this.prisma;
    const result = await client.financialAdjustment.aggregate({
      where: { invoiceId },
      _sum: { amountMinor: true },
    });
    return result._sum.amountMinor ?? 0n;
  }
}
