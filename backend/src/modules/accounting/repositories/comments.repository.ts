import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ExpenseComment, Prisma } from '../../../../prisma/generated/client';

/**
 * Discussion on an expense request.
 *
 * There is no update and no delete, matching the approval history beside it:
 * a comment is part of what the reviewers saw when they decided, so removing
 * one would rewrite the context of a decision that has already been taken.
 */
@Injectable()
export class CommentsRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    data: Prisma.ExpenseCommentCreateInput,
  ): Promise<ExpenseComment> {
    return this.prisma.expenseComment.create({ data });
  }

  async findByExpenseId(expenseRequestId: string): Promise<ExpenseComment[]> {
    return this.prisma.expenseComment.findMany({
      where: { expenseRequestId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
