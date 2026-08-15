import { describe, beforeEach, expect, it, jest } from '@jest/globals';
import { ExpenseService } from '../../../src/modules/accounting/services/expenses.service';
import { ExpensesPolicy } from '../../../src/modules/accounting/policies/expenses.policy';
import { ExpenseStatus } from '../../../src/modules/accounting/types/expense.types';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const BRANCH = 'branch-1';

const caller = (overrides: Partial<CallerContext> = {}): CallerContext => ({
  accountId: 'user-1',
  displayName: 'موظف',
  email: 'u@example.test',
  sessionId: 's1',
  roles: [],
  permissionKeys: [],
  authorizedBranchIds: [BRANCH],
  organizationWide: false,
  authenticatedAt: new Date().toISOString(),
  ...overrides,
});

const expenseRow = (over: Record<string, unknown> = {}) => ({
  id: 'exp-1',
  expenseNumber: 'EXP-001-2026-08-06',
  branchId: BRANCH,
  categoryId: 'cat-1',
  subcategoryId: 'sub-1',
  requestedById: 'user-1',
  expenseDate: new Date('2026-08-01'),
  description: 'Office supplies',
  amount: '1500.00',
  currency: 'SAR',
  precision: 2,
  status: ExpenseStatus.DRAFT,
  isArchived: false,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('ExpenseService', () => {
  let service: ExpenseService;
  let expenses: any;
  let attachments: any;
  let history: any;
  let events: any;
  let organization: any;

  beforeEach(() => {
    expenses = {
      create: jest.fn(async (d: any) => expenseRow(d)),
      findById: jest.fn(),
      findByExpenseNumber: jest.fn(async () => null),
      countForDate: jest.fn(async () => 0),
      updateWithVersion: jest.fn(async (_id: any, _v: any, data: any) =>
        expenseRow({ ...data, version: 2 }),
      ),
      archive: jest.fn(async () =>
        expenseRow({ status: ExpenseStatus.ARCHIVED, isArchived: true, version: 2 }),
      ),
    };
    attachments = { findByExpenseId: jest.fn(async () => []) };
    history = { create: jest.fn() };
    events = {
      emitExpenseCreated: jest.fn(),
      emitExpenseUpdated: jest.fn(),
      emitExpenseSubmitted: jest.fn(),
      emitExpenseArchived: jest.fn(),
    };
    organization = {
      resolveValue: jest.fn(async () => ({ id: 'x', label: 'l', active: true })),
    };

    service = new ExpenseService(
      expenses,
      attachments,
      history,
      new ExpensesPolicy(),
      events,
      { run: async (fn: any) => fn({}) } as any,
      { assertInScope: jest.fn() } as any,
      organization,
      { financialDefaults: async () => ({ currency: 'SAR', precision: 2 }) },
    );
  });

  describe('createExpense', () => {
    const dto: any = {
      branchId: BRANCH,
      categoryId: 'cat-1',
      subcategoryId: 'sub-1',
      expenseDate: new Date('2026-08-01'),
      description: 'Office supplies',
      amount: '1500.00',
      currency: 'SAR',
    };

    it('creates a draft and records the CREATE history entry', async () => {
      await service.createExpense(caller(), dto);
      expect(expenses.create).toHaveBeenCalled();
      expect(history.create).toHaveBeenCalled();
      expect(events.emitExpenseCreated).toHaveBeenCalled();
    });

    it('allocates a contract-shaped expense number', async () => {
      await service.createExpense(caller(), dto);
      const created = expenses.create.mock.calls[0][0] as any;
      expect(created.expenseNumber).toMatch(/^EXP-\d{3}-\d{4}-\d{2}-\d{2}$/);
    });

    it.each(['0.00', '-1.00'])('refuses amount %s', async (amount) => {
      await expect(
        service.createExpense(caller(), { ...dto, amount }),
      ).rejects.toThrow();
    });

    it('refuses a category that is not an active lookup value', async () => {
      organization.resolveValue.mockResolvedValueOnce(null);
      await expect(service.createExpense(caller(), dto)).rejects.toThrow(
        expect.objectContaining({ code: 'INVALID_CATEGORY' }),
      );
    });

    it('refuses an inactive subcategory', async () => {
      organization.resolveValue
        .mockResolvedValueOnce({ id: 'c', label: 'c', active: true })
        .mockResolvedValueOnce({ id: 's', label: 's', active: false });
      await expect(service.createExpense(caller(), dto)).rejects.toThrow(
        expect.objectContaining({ code: 'INVALID_CATEGORY' }),
      );
    });
  });

  describe('updateExpense', () => {
    it('updates a draft', async () => {
      expenses.findById.mockResolvedValue(expenseRow());
      const result = await service.updateExpense(caller(), 'exp-1', {
        expectedVersion: 1,
        description: 'Updated',
      } as any);
      expect(result.version).toBe(2);
      expect(events.emitExpenseUpdated).toHaveBeenCalled();
    });

    it('refuses to edit a submitted request', async () => {
      expenses.findById.mockResolvedValue(
        expenseRow({ status: ExpenseStatus.SUBMITTED }),
      );
      await expect(
        service.updateExpense(caller(), 'exp-1', {
          expectedVersion: 1,
          description: 'x',
        } as any),
      ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_STATUS' }));
    });

    it('detects a version conflict', async () => {
      expenses.findById.mockResolvedValue(expenseRow({ version: 5 }));
      await expect(
        service.updateExpense(caller(), 'exp-1', {
          expectedVersion: 1,
          description: 'x',
        } as any),
      ).rejects.toThrow(expect.objectContaining({ code: 'VERSION_CONFLICT' }));
    });
  });

  describe('submitExpense', () => {
    it('submits a draft that carries evidence', async () => {
      expenses.findById.mockResolvedValue(expenseRow());
      attachments.findByExpenseId.mockResolvedValue([{ id: 'att-1' }]);
      await service.submitExpense(caller(), 'exp-1', 1);
      expect(events.emitExpenseSubmitted).toHaveBeenCalled();
    });

    it('refuses to submit without an attachment', async () => {
      expenses.findById.mockResolvedValue(expenseRow());
      attachments.findByExpenseId.mockResolvedValue([]);
      await expect(service.submitExpense(caller(), 'exp-1', 1)).rejects.toThrow(
        expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      );
    });

    it('allows resubmitting a returned request', async () => {
      expenses.findById.mockResolvedValue(
        expenseRow({ status: ExpenseStatus.RETURNED }),
      );
      attachments.findByExpenseId.mockResolvedValue([{ id: 'att-1' }]);
      await expect(
        service.submitExpense(caller(), 'exp-1', 1),
      ).resolves.toBeDefined();
    });

    it('refuses to submit an already submitted request', async () => {
      expenses.findById.mockResolvedValue(
        expenseRow({ status: ExpenseStatus.SUBMITTED }),
      );
      await expect(service.submitExpense(caller(), 'exp-1', 1)).rejects.toThrow(
        expect.objectContaining({ code: 'INVALID_STATUS' }),
      );
    });
  });

  describe('archiveExpense', () => {
    it('archives an approved request', async () => {
      expenses.findById.mockResolvedValue(
        expenseRow({ status: ExpenseStatus.APPROVED }),
      );
      const result = await service.archiveExpense(caller(), 'exp-1', 1);
      expect(result.isArchived).toBe(true);
      expect(events.emitExpenseArchived).toHaveBeenCalled();
    });

    it('refuses to archive a draft', async () => {
      expenses.findById.mockResolvedValue(expenseRow());
      await expect(service.archiveExpense(caller(), 'exp-1', 1)).rejects.toThrow(
        expect.objectContaining({ code: 'INVALID_STATUS' }),
      );
    });
  });

  describe('getExpense', () => {
    it('reports a missing expense as NOT_FOUND', async () => {
      expenses.findById.mockResolvedValue(null);
      await expect(service.getExpense(caller(), 'nope')).rejects.toThrow(
        expect.objectContaining({ code: 'NOT_FOUND' }),
      );
    });
  });
});
