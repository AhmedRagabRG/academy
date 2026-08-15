import { EmployeePolicy } from '../../../src/modules/identity/employees/employee.policy';
import {
  DependencyNotFoundException,
  DuplicateException,
  InvalidTransitionException,
  OutOfScopeException,
  ValidationException,
  VersionConflictException,
} from '../../../src/core/exceptions';

describe('employee administration error rules', () => {
  const policy = new EmployeePolicy();
  it('rejects last-role and last-branch removal', () => {
    expect(() => policy.assertAssignments([], ['branch'], false)).toThrow(
      ValidationException,
    );
    expect(() => policy.assertAssignments(['role'], [], false)).toThrow(
      ValidationException,
    );
  });
  it('rejects archived reactivation and exposes current version conflicts', () => {
    expect(() => policy.assertTransition('ARCHIVED', 'ACTIVE')).toThrow(
      InvalidTransitionException,
    );
    expect(new VersionConflictException(7)).toMatchObject({
      code: 'VERSION_CONFLICT',
      currentVersion: 7,
      details: [{ field: 'expectedVersion', message: 'currentVersion=7' }],
    });
  });
  it('keeps duplicate, dependency, and branch-scope refusals distinct', () => {
    expect(new DuplicateException('EMAIL_EXISTS')).toMatchObject({
      code: 'EMAIL_EXISTS',
      status: 409,
    });
    expect(new DependencyNotFoundException()).toMatchObject({
      code: 'DEPENDENCY_NOT_FOUND',
      status: 422,
    });
    expect(new OutOfScopeException()).toMatchObject({
      code: 'out-of-scope',
      status: 403,
    });
  });
});
