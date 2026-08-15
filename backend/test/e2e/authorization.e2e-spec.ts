import { BranchScopeService } from '../../src/core/authorization/branch-scope.service';
import {
  ForbiddenException,
  OutOfScopeException,
  UnauthenticatedException,
} from '../../src/core/exceptions';
describe('authorization outcomes', () => {
  it('keeps 401, FORBIDDEN, and out-of-scope distinct', () => {
    expect(new UnauthenticatedException()).toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(new ForbiddenException()).toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
    expect(() =>
      new BranchScopeService().assertInScope(
        {
          accountId: 'a',
          sessionId: 's',
          displayName: '',
          email: '',
          roles: [{ id: 'r', code: 'r', displayName: 'R' }],
          permissionKeys: [],
          role: { id: 'r', code: 'r', permissionKeys: [] },
          authorizedBranchIds: [],
          organizationWide: false,
          authenticatedAt: '',
        },
        'branch',
      ),
    ).toThrow(OutOfScopeException);
  });
});
