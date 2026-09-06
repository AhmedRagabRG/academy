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
    expect(new OutOfScopeException()).toMatchObject({
      status: 403,
      code: 'OUT_OF_SCOPE',
    });
  });
});
