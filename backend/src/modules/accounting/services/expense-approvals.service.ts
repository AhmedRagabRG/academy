import { Injectable } from '@nestjs/common';
import type {
  ExpenseRequest,
  Prisma,
} from '../../../../prisma/generated/client';
import { BranchScopeService } from '../../../core/authorization/branch-scope.service';
import { ExpenseNotFoundException } from '../../../core/exceptions/accounting.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ExpenseEventEmitter } from '../events/expense.events';
import { ExpensesPolicy } from '../policies/expenses.policy';
import { ApprovalHistoryRepository } from '../repositories/approval-history.repository';
import { ExpensesRepository } from '../repositories/expenses.repository';
import { ACTION_FOR_STATUS } from '../types/approval-workflow.types';
import { ExpenseApprovalAction, ExpenseStatus } from '../types/expense.types';

@Injectable()
export class ExpenseApprovalService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly history: ApprovalHistoryRepository,
    private readonly policy: ExpensesPolicy,
    private readonly events: ExpenseEventEmitter,
    private readonly transactions: TransactionManager,
    private readonly branchScope: BranchScopeService,
  ) {}

  approveExpense(
    caller: CallerContext,
    id: string,
    expectedVersion: number,
    comment?: string,
  ): Promise<ExpenseRequest> {
    return this.decide(
      caller,
      id,
      expectedVersion,
      ExpenseStatus.APPROVED,
      comment,
    );
  }

  rejectExpense(
    caller: CallerContext,
    id: string,
    expectedVersion: number,
    comment?: string,
  ): Promise<ExpenseRequest> {
    return this.decide(
      caller,
      id,
      expectedVersion,
      ExpenseStatus.REJECTED,
      comment,
    );
  }

  returnExpense(
    caller: CallerContext,
    id: string,
    expectedVersion: number,
    comment?: string,
  ): Promise<ExpenseRequest> {
    return this.decide(
      caller,
      id,
      expectedVersion,
      ExpenseStatus.RETURNED,
      comment,
    );
  }

  /**
   * Claims a submitted request for review.
   *
   * Its own operation rather than a side effect of opening the request:
   * reading a detail page must not move it to Under Review, or an observer
   * silently claims whatever they look at.
   */
  async startReview(
    caller: CallerContext,
    id: string,
    expectedVersion: number,
  ): Promise<ExpenseRequest> {
    return this.advance(
      caller,
      id,
      expectedVersion,
      ExpenseStatus.UNDER_REVIEW,
      (from) => this.policy.assertReviewable(from),
    );
  }

  /**
   * Records that an approved spend actually left the account.
   *
   * Separate from approval and behind its own permission: approving
   * authorises, paying settles, and the two being distinct is the module's
   * financial control rather than a workflow nicety.
   */
  async markPaid(
    caller: CallerContext,
    id: string,
    expectedVersion: number,
    comment?: string,
  ): Promise<ExpenseRequest> {
    return this.advance(
      caller,
      id,
      expectedVersion,
      ExpenseStatus.PAID,
      (from) => this.policy.assertPayable(from),
      comment,
    );
  }

  async getApprovalHistory(caller: CallerContext, id: string) {
    const expense = await this.expenses.findById(id);
    if (!expense) throw new ExpenseNotFoundException();
    this.branchScope.assertInScope(caller, expense.branchId);
    return this.history.findByExpenseId(id);
  }

  /**
   * One path for approve, reject and return — the three differ only in target
   * status and whether a reason is required, so keeping them as three copies
   * is how the version and transition checks drift apart.
   */
  private async decide(
    caller: CallerContext,
    id: string,
    expectedVersion: number,
    target: ExpenseStatus,
    comment?: string,
  ): Promise<ExpenseRequest> {
    const expense = await this.expenses.findById(id);
    if (!expense) throw new ExpenseNotFoundException();
    this.branchScope.assertInScope(caller, expense.branchId);

    const from = expense.status as ExpenseStatus;
    this.policy.assertDecidable(from, target);
    this.policy.assertTransition(from, target);
    this.policy.assertVersion(expense.version, expectedVersion);
    this.policy.assertReason(target, comment);

    const updated = await this.transactions.run(async (tx) => {
      // Deciding straight from Submitted — without first claiming the request
      // through /review — records the implicit review step, so history shows
      // the state FR-009 requires instead of skipping it.
      if (from === ExpenseStatus.SUBMITTED) {
        await this.appendHistory(
          tx,
          id,
          caller,
          ExpenseApprovalAction.REVIEW,
          from,
          ExpenseStatus.UNDER_REVIEW,
        );
      }

      const row = await this.expenses.updateWithVersion(
        id,
        expectedVersion,
        { status: target },
        tx,
      );

      await this.appendHistory(
        tx,
        id,
        caller,
        ACTION_FOR_STATUS[target] ?? ExpenseApprovalAction.REVIEW,
        from === ExpenseStatus.SUBMITTED ? ExpenseStatus.UNDER_REVIEW : from,
        target,
        comment,
      );

      return row;
    });

    this.emitFor(target, updated, caller.accountId, from);
    return updated;
  }

  /**
   * A single-step move with no implicit review and no reason.
   *
   * `decide` carries rules that belong only to a decision — the Submitted
   * shortcut and the mandatory reason — so review and payment take this path
   * instead of growing conditionals inside that one.
   */
  private async advance(
    caller: CallerContext,
    id: string,
    expectedVersion: number,
    target: ExpenseStatus,
    assertFrom: (from: ExpenseStatus) => void,
    comment?: string,
  ): Promise<ExpenseRequest> {
    const expense = await this.expenses.findById(id);
    if (!expense) throw new ExpenseNotFoundException();
    this.branchScope.assertInScope(caller, expense.branchId);

    const from = expense.status as ExpenseStatus;
    assertFrom(from);
    this.policy.assertTransition(from, target);
    this.policy.assertVersion(expense.version, expectedVersion);
    this.policy.assertCommentLength(comment);

    return this.transactions.run(async (tx) => {
      const row = await this.expenses.updateWithVersion(
        id,
        expectedVersion,
        { status: target },
        tx,
      );
      await this.appendHistory(
        tx,
        id,
        caller,
        ACTION_FOR_STATUS[target] ?? ExpenseApprovalAction.REVIEW,
        from,
        target,
        comment,
      );
      return row;
    });
  }

  private appendHistory(
    tx: Prisma.TransactionClient,
    expenseId: string,
    caller: CallerContext,
    action: ExpenseApprovalAction,
    previousStatus: string,
    newStatus: string,
    comment?: string,
  ) {
    return this.history.create(
      {
        expenseRequest: { connect: { id: expenseId } },
        action,
        previousStatus,
        newStatus,
        performedById: caller.accountId,
        performedByName: caller.displayName,
        ...(comment ? { comment } : {}),
      },
      tx,
    );
  }

  private emitFor(
    target: ExpenseStatus,
    expense: ExpenseRequest,
    actorId: string,
    fromStatus: string,
  ): void {
    if (target === ExpenseStatus.APPROVED) {
      this.events.emitExpenseApproved(expense, actorId, fromStatus);
    } else if (target === ExpenseStatus.REJECTED) {
      this.events.emitExpenseRejected(expense, actorId, fromStatus);
    } else {
      this.events.emitExpenseReturned(expense, actorId, fromStatus);
    }
  }
}
