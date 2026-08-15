import { mapEmployee } from '../../../src/modules/identity/mappers/identity.mapper';
import { PermissionsGuard } from '../../../src/core/authorization/permissions.guard';
import { ForbiddenException } from '../../../src/core/exceptions';
import type { ExecutionContext } from '@nestjs/common';

describe('live multi-role RBAC union', () => {
  it('unions active permissions, removes duplicates, and ignores inactive roles/permissions', () => {
    const baseRole = { description: '', version: 1 };
    const employee = mapEmployee({
      id: 'a',
      email: 'a@example.com',
      displayName: 'أحمد',
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
      roles: [
        {
          role: {
            ...baseRole,
            id: '1',
            code: 'a',
            displayName: 'أ',
            status: 'ACTIVE',
            permissions: [
              { permission: { key: 'settings.users.view', active: true } },
              { permission: { key: 'shared', active: true } },
            ],
          },
        },
        {
          role: {
            ...baseRole,
            id: '2',
            code: 'b',
            displayName: 'ب',
            status: 'ACTIVE',
            permissions: [
              { permission: { key: 'shared', active: true } },
              { permission: { key: 'disabled', active: false } },
            ],
          },
        },
        {
          role: {
            ...baseRole,
            id: '3',
            code: 'c',
            displayName: 'ج',
            status: 'INACTIVE',
            permissions: [
              { permission: { key: 'inactive-role', active: true } },
            ],
          },
        },
      ],
    });
    expect(employee.permissionKeys).toEqual(['settings.users.view', 'shared']);
  });

  it('enforces the live union with AND semantics on the next request', () => {
    const required = ['settings.users.view', 'settings.users.update'];
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn((key: string) =>
        key === 'requiredPermissions' ? required : false,
      ),
    } as never);
    const context = (permissionKeys: string[]) =>
      ({
        getHandler: () => null,
        getClass: () => null,
        switchToHttp: () => ({
          getRequest: () => ({ caller: { accountId: 'a', permissionKeys } }),
        }),
      }) as unknown as ExecutionContext;
    expect(() => guard.canActivate(context(['settings.users.view']))).toThrow(
      ForbiddenException,
    );
    expect(
      guard.canActivate(
        context(['settings.users.view', 'settings.users.update']),
      ),
    ).toBe(true);
  });
});
