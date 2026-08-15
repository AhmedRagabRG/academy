import {
  DuplicateException,
  RoleInUseException,
  ValidationException,
  VersionConflictException,
} from '../../../src/core/exceptions';
import { RoleService } from '../../../src/modules/identity/roles/role.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller = { accountId: 'actor' } as CallerContext;
const role = (overrides: Record<string, unknown> = {}) => ({
  id: 'role',
  code: 'staff',
  displayName: 'موظف',
  description: '',
  status: 'ACTIVE',
  version: 1,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  permissions: [],
  _count: { accounts: 0 },
  ...overrides,
});

describe('RoleService invariants', () => {
  const fixture = (
    overrides: {
      role?: Record<string, unknown>;
      activePermissions?: unknown[];
      replaceError?: Error;
    } = {},
  ) => {
    const current = role(overrides.role);
    const roles = {
      findById: jest.fn().mockResolvedValue(current),
      updateVersioned: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue(current),
    };
    const permissions = {
      findActiveByIds: jest
        .fn()
        .mockResolvedValue(overrides.activePermissions ?? []),
      replaceForRole: jest
        .fn()
        .mockImplementation(() =>
          overrides.replaceError
            ? Promise.reject(overrides.replaceError)
            : Promise.resolve(current),
        ),
    };
    const events = { emit: jest.fn() };
    const transactions = {
      run: jest.fn((work: (tx: object) => Promise<unknown>) => work({})),
    };
    return {
      roles,
      permissions,
      events,
      service: new RoleService(
        roles as never,
        permissions as never,
        transactions as never,
        events as never,
      ),
    };
  };

  it('blocks archival of an assigned role and stale writes', async () => {
    await expect(
      fixture({ role: { _count: { accounts: 1 } } }).service.status(
        caller,
        'role',
        {
          status: 'ARCHIVED',
          expectedVersion: 1,
        },
      ),
    ).rejects.toBeInstanceOf(RoleInUseException);
    const stale = fixture();
    stale.roles.updateVersioned.mockResolvedValue({ count: 0 });
    await expect(
      stale.service.update(caller, 'role', {
        displayName: 'جديد',
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(VersionConflictException);
  });

  it('maps normalized role uniqueness failures to a stable conflict', async () => {
    const f = fixture({ activePermissions: [] });
    f.roles.create.mockRejectedValue(new Error('unique constraint'));
    await expect(
      f.service.create(caller, {
        code: 'staff',
        displayName: 'موظف',
        description: '',
        permissionIds: [],
        status: 'ACTIVE',
      }),
    ).rejects.toBeInstanceOf(DuplicateException);
  });

  it('rejects unknown/inactive permission IDs', async () => {
    await expect(
      fixture().service.replacePermissions(
        'role',
        {
          permissionIds: ['missing'],
          expectedVersion: 1,
        },
        caller,
      ),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('does not emit a success event when permission replacement rolls back', async () => {
    const f = fixture({
      activePermissions: [{ id: 'permission' }],
      replaceError: new Error('rollback'),
    });
    await expect(
      f.service.replacePermissions(
        'role',
        {
          permissionIds: ['permission'],
          expectedVersion: 1,
        },
        caller,
      ),
    ).rejects.toThrow('rollback');
    expect(f.events.emit).not.toHaveBeenCalled();
  });
});
