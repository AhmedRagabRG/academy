import { isPermissionKey } from '../../src/core/authorization/permission-key';
import { RecordPermissionsHelper } from '../../src/core/authorization/record-permissions.helper';
import type { CallerContext } from '../../src/shared/types/caller-context';
const caller: CallerContext = {
  accountId: 'a',
  sessionId: 's',
  displayName: 'A',
  email: 'a@example.com',
  roles: [{ id: 'r', code: 'role', displayName: 'Role' }],
  permissionKeys: ['dashboard.view'],
  role: { id: 'r', code: 'role', permissionKeys: ['dashboard.view'] },
  organizationWide: false,
  authenticatedAt: new Date().toISOString(),
};
describe('authorization foundation', () => {
  it('validates permission key shape', () => {
    expect(isPermissionKey('dashboard.view')).toBe(true);
    expect(isPermissionKey('INVALID')).toBe(false);
  });
  it('computes explicit per-record permissions', () =>
    expect(
      new RecordPermissionsHelper().compute(caller, [
        'dashboard.view',
        'tickets.update',
      ]),
    ).toEqual({ 'dashboard.view': true, 'tickets.update': false }));
});
