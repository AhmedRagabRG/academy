import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ExpenseAttachment, Prisma } from '../../../../prisma/generated/client';

@Injectable()
export class AttachmentsRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    data: Prisma.ExpenseAttachmentCreateInput,
  ): Promise<ExpenseAttachment> {
    return this.prisma.expenseAttachment.create({ data });
  }

  async findById(id: string): Promise<ExpenseAttachment | null> {
    return this.prisma.expenseAttachment.findUnique({ where: { id } });
  }

  async findByUploadAttempt(
    uploadAttemptId: string,
  ): Promise<ExpenseAttachment | null> {
    return this.prisma.expenseAttachment.findUnique({
      where: { uploadAttemptId },
    });
  }

  async findByExpenseId(
    expenseRequestId: string,
  ): Promise<ExpenseAttachment[]> {
    return this.prisma.expenseAttachment.findMany({
      where: { expenseRequestId },
    });
  }

  /**
   * Attachment counts for a page of expenses, as one grouped query.
   *
   * The list needs a count per row and asking per row would put a query
   * behind every line of the table. Expenses with no attachments have no rows
   * to group, so they are absent from the result rather than present as zero —
   * callers read a missing key as none.
   */
  async countByExpenseIds(
    expenseRequestIds: string[],
  ): Promise<Map<string, number>> {
    if (!expenseRequestIds.length) return new Map();
    const grouped = await this.prisma.expenseAttachment.groupBy({
      by: ['expenseRequestId'],
      where: { expenseRequestId: { in: expenseRequestIds } },
      _count: { _all: true },
    });
    return new Map(
      grouped.map((row) => [row.expenseRequestId, row._count._all]),
    );
  }

  async delete(id: string): Promise<ExpenseAttachment> {
    return this.prisma.expenseAttachment.delete({ where: { id } });
  }
}
