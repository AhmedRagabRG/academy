import {
  CatalogCodeLockedException,
  DuplicateException,
  OutOfScopeException,
  VersionConflictException,
} from '../../../src/core/exceptions';
describe('product lifecycle stable errors', () => {
  it('publishes closed duplicate/version/code/scope errors', () => {
    expect(new DuplicateException().code).toBe('DUPLICATE_VALUE');
    expect(new VersionConflictException(3).status).toBe(409);
    expect(new CatalogCodeLockedException().code).toBe('CODE_LOCKED');
    expect(new OutOfScopeException().status).toBe(403);
  });
});
