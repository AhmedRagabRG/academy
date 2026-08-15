import { describe, beforeEach, expect, it } from '@jest/globals';
import { ExpenseMapper } from '../../../src/modules/accounting/mappers/expense.mapper';
import { ExpenseStatus } from '../../../src/modules/accounting/types/expense.types';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const REQUESTER_KEYS = [
  'accounting.requests.view',
  'accounting.requests.update',
  'accounting.requests.submit',
];
const APPROVER_KEYS = [
  'accounting.requests.view',
  'accounting.requests.decide',
  'accounting.requests.cancel',
];

const caller = (
  accountId: string,
  permissionKeys: string[],
  authorizedBranchIds: string[],
): CallerContext => ({
  accountId,
  displayName: accountId,
  email: `${accountId}@example.test`,
  sessionId: 's1',
  roles: [],
  permissionKeys,
  authorizedBranchIds,
  organizationWide: false,
  authenticatedAt: new Date().toISOString(),
});

const expense = (over: Record<string, unknown> = {}) =>
  ({
    id: 'exp-1',
    expenseNumber: 'EXP-001-2026-08-06',
    branchId: 'branch-1',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1',
    requestedById: 'user-123',
    expenseDate: new Date('2026-08-05'),
    description: 'Office supplies',
    amount: '15000.00',
    currency: 'SAR',
    precision: 2,
    status: ExpenseStatus.DRAFT,
    isArchived: false,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as never;

describe('ExpenseMapper', () => {
  let mapper: ExpenseMapper;
  beforeEach(() => {
    mapper = new ExpenseMapper();
  });

  describe('wire status', () => {
    it.each([
      [ExpenseStatus.DRAFT, 'Draft'],
      [ExpenseStatus.SUBMITTED, 'Submitted'],
      [ExpenseStatus.UNDER_REVIEW, 'UnderReview'],
      [ExpenseStatus.APPROVED, 'Approved'],
      [ExpenseStatus.REJECTED, 'Rejected'],
      [ExpenseStatus.RETURNED, 'Returned'],
      [ExpenseStatus.ARCHIVED, 'Archived'],
    ])('publishes %s as %s', (stored, wire) => {
      const dto = mapper.toListDto(
        expense({ status: stored }),
        mapper.calculatePermissions(
          expense({ status: stored }),
          caller('user-123', REQUESTER_KEYS, ['branch-1']),
        ),
      );
      expect(dto.status).toBe(wire);
    });
  });

  describe('toListDto', () => {
    it('publishes amount and currency as flat contract fields', () => {
      const dto = mapper.toListDto(expense(), {
        canEdit: true,
        canSubmit: true,
        canReview: false,
        canApprove: false,
        canReject: false,
        canReturn: false,
        canMarkPaid: false,
        canArchive: false,
        canComment: false,
      });
      expect(dto.amount).toBe('15000.00');
      expect(dto.currency).toBe('SAR');
      expect(dto.expenseNumber).toBe('EXP-001-2026-08-06');
    });
  });

  describe('calculatePermissions', () => {
    it('lets the owner edit and submit a draft', () => {
      const p = mapper.calculatePermissions(
        expense(),
        caller('user-123', REQUESTER_KEYS, ['branch-1']),
      );
      expect(p).toMatchObject({ canEdit: true, canSubmit: true, canApprove: false });
    });

    it('does not let a non-owner edit, even with the permission', () => {
      const p = mapper.calculatePermissions(
        expense(),
        caller('someone-else', REQUESTER_KEYS, ['branch-1']),
      );
      expect(p.canEdit).toBe(false);
    });

    it('lets an approver decide on a submitted request', () => {
      const p = mapper.calculatePermissions(
        expense({ status: ExpenseStatus.SUBMITTED }),
        caller('mgr-1', APPROVER_KEYS, ['branch-1']),
      );
      expect(p).toMatchObject({ canApprove: true, canReject: true, canReturn: true });
    });

    it('lets an approver decide while under review', () => {
      const p = mapper.calculatePermissions(
        expense({ status: ExpenseStatus.UNDER_REVIEW }),
        caller('mgr-1', APPROVER_KEYS, ['branch-1']),
      );
      expect(p.canApprove).toBe(true);
    });

    it('makes an approved request read-only but archivable', () => {
      const p = mapper.calculatePermissions(
        expense({ status: ExpenseStatus.APPROVED }),
        caller('mgr-1', APPROVER_KEYS, ['branch-1']),
      );
      expect(p).toMatchObject({ canEdit: false, canSubmit: false, canArchive: true });
    });

    it('grants nothing outside the caller branch scope', () => {
      const p = mapper.calculatePermissions(
        expense({ branchId: 'branch-2' }),
        caller('user-123', REQUESTER_KEYS, ['branch-1']),
      );
      expect(Object.values(p).every((v) => v === false)).toBe(true);
    });

    it('grants nothing without the permission keys', () => {
      const p = mapper.calculatePermissions(
        expense(),
        caller('user-123', [], ['branch-1']),
      );
      expect(Object.values(p).every((v) => v === false)).toBe(true);
    });

    it('allows a rejected request to be archived but never edited', () => {
      const p = mapper.calculatePermissions(
        expense({ status: ExpenseStatus.REJECTED }),
        caller('mgr-1', APPROVER_KEYS, ['branch-1']),
      );
      expect(p.canEdit).toBe(false);
      expect(p.canArchive).toBe(true);
    });
  });
});
