import { Injectable } from '@nestjs/common';
import {
  ExpenseApprovalHistory,
  Prisma,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Approval history is immutable: there is deliberately no update and no delete
 * here. A correction is another history row, never a rewrite of an existing
 * one, because the record is what an auditor relies on.
 */
@Injectable()
export class ApprovalHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.ExpenseApprovalHistoryCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseApprovalHistory> {
    const client = tx ?? this.prisma;
    return client.expenseApprovalHistory.create({ data });
  }

  findByExpenseId(
    expenseRequestId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseApprovalHistory[]> {
    const client = tx ?? this.prisma;
    return client.expenseApprovalHistory.findMany({
      where: { expenseRequestId },
      orderBy: { performedAt: 'asc' },
    });
  }

  count(where: Prisma.ExpenseApprovalHistoryWhereInput): Promise<number> {
    return this.prisma.expenseApprovalHistory.count({ where });
  }
}
