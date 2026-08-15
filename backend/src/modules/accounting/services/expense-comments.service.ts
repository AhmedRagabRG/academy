import { Injectable } from '@nestjs/common';
import { BranchScopeService } from '../../../core/authorization/branch-scope.service';
import {
  ExpenseNotFoundException,
  ExpenseValidationException,
} from '../../../core/exceptions/accounting.exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import { CommentsRepository } from '../repositories/comments.repository';
import { ExpensesRepository } from '../repositories/expenses.repository';
import { MAX_COMMENT_LENGTH } from '../types/approval-workflow.types';
import type { ExpenseCommentDto } from '../dtos/expense.response.dto';

/**
 * Discussion on a request, kept apart from the approval history.
 *
 * Commenting carries no version check and moves no status: it is conversation,
 * not a decision, and making it a workflow step would let a comment race an
 * approval. Any caller who may view the request may read the thread; writing
 * to it is its own permission.
 */
@Injectable()
export class ExpenseCommentsService {
  constructor(
    private readonly comments: CommentsRepository,
    private readonly expenses: ExpensesRepository,
    private readonly branchScope: BranchScopeService,
  ) {}

  async list(
    caller: CallerContext,
    expenseId: string,
  ): Promise<ExpenseCommentDto[]> {
    await this.loadInScope(caller, expenseId);
    const rows = await this.comments.findByExpenseId(expenseId);
    return rows.map((row) => this.toDto(row));
  }

  async add(
    caller: CallerContext,
    expenseId: string,
    body: string,
  ): Promise<ExpenseCommentDto> {
    await this.loadInScope(caller, expenseId);

    const trimmed = body?.trim() ?? '';
    if (!trimmed) {
      throw new ExpenseValidationException([
        { field: 'body', message: 'required' },
      ]);
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      throw new ExpenseValidationException([
        { field: 'body', message: `max-${MAX_COMMENT_LENGTH}-characters` },
      ]);
    }

    const created = await this.comments.create({
      expenseRequest: { connect: { id: expenseId } },
      body: trimmed,
      authorId: caller.accountId,
      authorName: caller.displayName,
    });
    return this.toDto(created);
  }

  private async loadInScope(caller: CallerContext, expenseId: string) {
    const expense = await this.expenses.findById(expenseId);
    if (!expense) throw new ExpenseNotFoundException();
    this.branchScope.assertInScope(caller, expense.branchId);
    return expense;
  }

  private toDto(row: {
    id: string;
    expenseRequestId: string;
    body: string;
    authorId: string;
    authorName: string;
    createdAt: Date;
  }): ExpenseCommentDto {
    return {
      id: row.id,
      expenseRequestId: row.expenseRequestId,
      body: row.body,
      author: { id: row.authorId, name: row.authorName },
      createdAt: row.createdAt,
    };
  }
}
