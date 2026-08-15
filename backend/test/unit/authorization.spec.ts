import { BranchScopeService } from '../../src/core/authorization/branch-scope.service';
import { isPermissionKey } from '../../src/core/authorization/permission-key';
import { RecordPermissionsHelper } from '../../src/core/authorization/record-permissions.helper';
import { OutOfScopeException } from '../../src/core/exceptions';
import type { CallerContext } from '../../src/shared/types/caller-context';
const caller: CallerContext = {
  accountId: 'a',
  sessionId: 's',
  displayName: 'A',
  email: 'a@example.com',
  roles: [{ id: 'r', code: 'role', displayName: 'Role' }],
  permissionKeys: ['students.view'],
  role: { id: 'r', code: 'role', permissionKeys: ['students.view'] },
  authorizedBranchIds: ['b1'],
  organizationWide: false,
  authenticatedAt: new Date().toISOString(),
};
describe('authorization foundation', () => {
  it('validates permission key shape', () => {
    expect(isPermissionKey('students.view')).toBe(true);
    expect(isPermissionKey('INVALID')).toBe(false);
  });
  it('distinguishes branch scope', () => {
    const service = new BranchScopeService();
    expect(() => service.assertInScope(caller, 'b2')).toThrow(
      OutOfScopeException,
    );
    expect(service.applyToQuery(caller, { active: true })).toHaveProperty(
      'AND',
    );
  });
  it('computes explicit per-record permissions', () =>
    expect(
      new RecordPermissionsHelper().compute(caller, [
        'students.view',
        'students.update',
      ]),
    ).toEqual({ 'students.view': true, 'students.update': false }));
});
