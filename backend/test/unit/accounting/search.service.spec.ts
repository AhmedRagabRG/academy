import { describe, beforeEach, expect, it, jest } from '@jest/globals';
import { ExpenseSearchService } from '../../../src/modules/accounting/services/expense-search.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller = (over: Partial<CallerContext> = {}): CallerContext => ({
  accountId: 'user-1',
  displayName: 'موظف',
  email: 'u@example.test',
  sessionId: 's1',
  roles: [],
  permissionKeys: [],
  authorizedBranchIds: ['branch-1'],
  organizationWide: false,
  authenticatedAt: new Date().toISOString(),
  ...over,
});

describe('ExpenseSearchService', () => {
  let service: ExpenseSearchService;
  let repository: any;
  let attachments: any;

  const whereOf = () => repository.findMany.mock.calls.at(-1)![0] as any;
  const orderOf = () => repository.findMany.mock.calls.at(-1)![3] as any;
  const pagingOf = () => ({
    take: repository.findMany.mock.calls.at(-1)![1],
    skip: repository.findMany.mock.calls.at(-1)![2],
  });

  beforeEach(() => {
    repository = { findMany: jest.fn(async () => ({ data: [], total: 0 })) };
    attachments = { countByExpenseIds: jest.fn(async () => new Map()) };
    service = new ExpenseSearchService(repository, attachments);
  });

  it('scopes to the caller branches by default', async () => {
    await service.listExpenses(caller(), {});
    expect(whereOf().branchId).toEqual({ in: ['branch-1'] });
  });

  it('refuses a branch filter outside the caller scope', async () => {
    await expect(
      service.listExpenses(caller(), { branchId: 'branch-9' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'out-of-scope' }));
  });

  it('lets an organization-wide caller see every branch', async () => {
    await service.listExpenses(caller({ organizationWide: true }), {});
    expect(whereOf().branchId).toBeUndefined();
  });

  it('translates the wire status to the stored enum', async () => {
    await service.listExpenses(caller(), { status: 'UnderReview' });
    expect(whereOf().status).toBe('UNDER_REVIEW');
  });

  it('filters by category and subcategory', async () => {
    await service.listExpenses(caller(), {
      categoryId: 'cat-1',
      subcategoryId: 'sub-1',
    });
    expect(whereOf().categoryId).toBe('cat-1');
    expect(whereOf().subcategoryId).toBe('sub-1');
  });

  it('filters by approver through the approval history', async () => {
    await service.listExpenses(caller(), { approvedBy: 'mgr-1' });
    expect(whereOf().approvalHistory).toEqual({
      some: { performedById: 'mgr-1', action: 'APPROVE' },
    });
  });

  it('treats the date range upper bound as inclusive of the whole day', async () => {
    await service.listExpenses(caller(), {
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    const range = whereOf().expenseDate;
    expect(range.gte).toEqual(new Date('2026-01-01'));
    expect(range.lte).toEqual(new Date('2026-01-31T23:59:59.999Z'));
  });

  it('searches expense number and description', async () => {
    await service.listExpenses(caller(), { search: 'office' });
    expect(whereOf().OR).toHaveLength(2);
  });

  it('folds Arabic orthography so alif variants match', async () => {
    await service.listExpenses(caller(), { search: 'أحمد' });
    // The folded form is what reaches the query, otherwise "أحمد" and "احمد"
    // would be different searches to the database.
    expect(whereOf().OR[1].description.contains).toBe('احمد');
  });

  it('folds Arabic-Indic digits so an expense number still matches', async () => {
    await service.listExpenses(caller(), { search: '٠٠١' });
    expect(whereOf().OR[0].expenseNumber.contains).toBe('001');
  });

  it('excludes archived by default and includes them on request', async () => {
    await service.listExpenses(caller(), {});
    expect(whereOf().isArchived).toBe(false);

    await service.listExpenses(caller(), { includeArchived: true });
    expect(whereOf().isArchived).toBeUndefined();
  });

  it('defaults to newest first', async () => {
    await service.listExpenses(caller(), {});
    expect(orderOf()).toEqual({ createdAt: 'desc' });
  });

  it.each([
    ['expenseDate', { expenseDate: 'asc' }],
    ['amount', { amount: 'asc' }],
    ['status', { status: 'asc' }],
  ])('sorts by %s', async (sortBy, expected) => {
    await service.listExpenses(caller(), { sortBy: sortBy as any, sortOrder: 'asc' });
    expect(orderOf()).toEqual(expected);
  });

  it('applies default paging', async () => {
    await service.listExpenses(caller(), {});
    expect(pagingOf()).toEqual({ take: 20, skip: 0 });
  });

  it('caps page size at 100', async () => {
    await service.listExpenses(caller(), { pageSize: 500 });
    expect(pagingOf().take).toBe(100);
  });

  it('computes the offset from the page', async () => {
    await service.listExpenses(caller(), { page: 3, pageSize: 10 });
    expect(pagingOf().skip).toBe(20);
  });

  it('reports pagination meta', async () => {
    repository.findMany.mockResolvedValue({ data: [], total: 45 });
    const result = await service.listExpenses(caller(), { page: 2, pageSize: 20 });
    expect(result.meta).toEqual({
      total: 45,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });
});
