import {
  InvalidCredentialsException,
  VersionConflictException,
} from '../../../src/core/exceptions';
import { ProfileService } from '../../../src/modules/identity/profile/profile.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller = { accountId: 'account', sessionId: 'current' } as CallerContext;
const employee = {
  id: 'account',
  email: 'a@example.com',
  passwordHash: 'stored',
  displayName: 'أحمد محمود',
  phone: '+201000000001',
  position: null,
  departmentId: null,
  branchIds: [],
  organizationWide: true,
  avatar: null,
  status: 'ACTIVE',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [],
};

describe('ProfileService concurrency and password transaction', () => {
  it('returns currentVersion for stale profile updates', async () => {
    const service = new ProfileService(
      {
        updateProfile: jest.fn().mockResolvedValue({ count: 0 }),
        findById: jest.fn().mockResolvedValue(employee),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.update(caller, { displayName: 'اسم جديد', expectedVersion: 0 }),
    ).rejects.toBeInstanceOf(VersionConflictException);
  });

  it('does not change state when the current password is wrong', async () => {
    const employees = {
      findById: jest.fn().mockResolvedValue(employee),
      updateVersioned: jest.fn(),
    };
    const service = new ProfileService(
      employees as never,
      { verify: jest.fn().mockResolvedValue(false) } as never,
      { validate: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.changePassword(caller, {
        currentPassword: 'wrong',
        newPassword: 'ReplacementPass1!',
        confirmPassword: 'ReplacementPass1!',
        expectedVersion: 1,
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(employees.updateVersioned).not.toHaveBeenCalled();
  });

  it('updates atomically, revokes only other sessions, then emits', async () => {
    const order: string[] = [];
    const sessions = {
      revokeOthersInTransaction: jest.fn().mockImplementation((_a, current) => {
        order.push(`revoke:${current}`);
        return Promise.resolve(2);
      }),
    };
    const service = new ProfileService(
      {
        findById: jest.fn().mockResolvedValue(employee),
        updateVersioned: jest.fn().mockImplementation(() => {
          order.push('password');
          return Promise.resolve({ count: 1 });
        }),
      } as never,
      {
        verify: jest.fn().mockResolvedValue(true),
        hash: jest.fn().mockResolvedValue('new-hash'),
      },
      { validate: jest.fn() } as never,
      sessions as never,
      {
        run: jest.fn(async (work: (tx: object) => Promise<unknown>) => {
          const result = await work({});
          order.push('commit');
          return result;
        }),
      } as never,
      { emit: jest.fn(() => order.push('event')) } as never,
    );
    await service.changePassword(caller, {
      currentPassword: 'correct',
      newPassword: 'ReplacementPass1!',
      confirmPassword: 'ReplacementPass1!',
      expectedVersion: 1,
    });
    expect(order).toEqual(['password', 'revoke:current', 'commit', 'event']);
  });

  it('emits no password-change event when the transaction rolls back', async () => {
    const events = { emit: jest.fn() };
    const service = new ProfileService(
      { findById: jest.fn().mockResolvedValue(employee) } as never,
      {
        verify: jest.fn().mockResolvedValue(true),
        hash: jest.fn().mockResolvedValue('new-hash'),
      },
      { validate: jest.fn() } as never,
      {} as never,
      { run: jest.fn().mockRejectedValue(new Error('rollback')) } as never,
      events as never,
    );
    await expect(
      service.changePassword(caller, {
        currentPassword: 'correct',
        newPassword: 'ReplacementPass1!',
        confirmPassword: 'ReplacementPass1!',
        expectedVersion: 1,
      }),
    ).rejects.toThrow('rollback');
    expect(events.emit).not.toHaveBeenCalled();
  });
});
