import { describe, beforeEach, expect, it, jest } from '@jest/globals';
import { ExpenseApprovalService } from '../../../src/modules/accounting/services/expense-approvals.service';
import { ExpensesPolicy } from '../../../src/modules/accounting/policies/expenses.policy';
import {
  ExpenseApprovalAction,
  ExpenseStatus,
} from '../../../src/modules/accounting/types/expense.types';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const manager: CallerContext = {
  accountId: 'mgr-1',
  displayName: 'مدير مالي',
  email: 'm@example.test',
  sessionId: 's1',
  roles: [],
  permissionKeys: ['accounting.requests.decide'],
  authorizedBranchIds: ['branch-1'],
  organizationWide: true,
  authenticatedAt: new Date().toISOString(),
};

const row = (over: Record<string, unknown> = {}) => ({
  id: 'exp-1',
  branchId: 'branch-1',
  status: ExpenseStatus.SUBMITTED,
  version: 2,
  ...over,
});

describe('ExpenseApprovalService', () => {
  let service: ExpenseApprovalService;
  let expenses: any;
  let history: any;
  let events: any;

  beforeEach(() => {
    expenses = {
      findById: jest.fn(async () => row()),
      updateWithVersion: jest.fn(async (_id: any, _v: any, data: any) =>
        row({ ...data, version: 3 }),
      ),
    };
    history = { create: jest.fn(), findByExpenseId: jest.fn(async () => []) };
    events = {
      emitExpenseApproved: jest.fn(),
      emitExpenseRejected: jest.fn(),
      emitExpenseReturned: jest.fn(),
    };

    service = new ExpenseApprovalService(
      expenses,
      history,
      new ExpensesPolicy(),
      events,
      { run: async (fn: any) => fn({}) } as any,
      { assertInScope: jest.fn() } as any,
    );
  });

  describe('approveExpense', () => {
    it('approves a submitted request', async () => {
      const result = await service.approveExpense(manager, 'exp-1', 2, 'ok');
      expect(result.status).toBe(ExpenseStatus.APPROVED);
      expect(events.emitExpenseApproved).toHaveBeenCalled();
    });

    it('records the implicit review step before the decision', async () => {
      await service.approveExpense(manager, 'exp-1', 2);
      const actions = history.create.mock.calls.map((c: any[]) => c[0].action);
      // FR-009's Under Review state must appear in the audit trail even though
      // no /review route exists.
      expect(actions).toEqual([
        ExpenseApprovalAction.REVIEW,
        ExpenseApprovalAction.APPROVE,
      ]);
    });

    it('does not re-record review when already under review', async () => {
      expenses.findById.mockResolvedValue(
        row({ status: ExpenseStatus.UNDER_REVIEW }),
      );
      await service.approveExpense(manager, 'exp-1', 2);
      const actions = history.create.mock.calls.map((c: any[]) => c[0].action);
      expect(actions).toEqual([ExpenseApprovalAction.APPROVE]);
    });

    it('refuses to approve a draft', async () => {
      expenses.findById.mockResolvedValue(row({ status: ExpenseStatus.DRAFT }));
      await expect(
        service.approveExpense(manager, 'exp-1', 2),
      ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_STATUS' }));
    });

    it('detects a version conflict', async () => {
      await expect(
        service.approveExpense(manager, 'exp-1', 1),
      ).rejects.toThrow(expect.objectContaining({ code: 'VERSION_CONFLICT' }));
    });
  });

  describe('rejectExpense', () => {
    it('rejects with a reason', async () => {
      const result = await service.rejectExpense(manager, 'exp-1', 2, 'over budget');
      expect(result.status).toBe(ExpenseStatus.REJECTED);
      expect(events.emitExpenseRejected).toHaveBeenCalled();
    });

    it('refuses to reject without a reason', async () => {
      await expect(service.rejectExpense(manager, 'exp-1', 2)).rejects.toThrow(
        expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      );
    });

    it('stores the comment on the history row', async () => {
      await service.rejectExpense(manager, 'exp-1', 2, 'over budget');
      const decision = history.create.mock.calls.at(-1)![0] as any;
      expect(decision.comment).toBe('over budget');
      expect(decision.performedByName).toBe('مدير مالي');
    });
  });

  describe('returnExpense', () => {
    it('returns with a reason and emits', async () => {
      const result = await service.returnExpense(manager, 'exp-1', 2, 'missing receipt');
      expect(result.status).toBe(ExpenseStatus.RETURNED);
      expect(events.emitExpenseReturned).toHaveBeenCalled();
    });

    it('refuses to return without a reason', async () => {
      await expect(service.returnExpense(manager, 'exp-1', 2)).rejects.toThrow();
    });
  });

  describe('getApprovalHistory', () => {
    it('reports a missing expense as NOT_FOUND', async () => {
      expenses.findById.mockResolvedValue(null);
      await expect(
        service.getApprovalHistory(manager, 'nope'),
      ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
    });
  });
});
