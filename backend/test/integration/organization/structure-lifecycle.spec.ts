import { BranchPolicy } from '../../../src/modules/organization/branches/branch.policy';
import {
  EntityInUseException,
  OutOfScopeException,
} from '../../../src/core/exceptions';
describe('structure lifecycle policy', () => {
  it('refuses out-of-scope access', () => {
    const refs = {
      validateManager: jest.fn(),
      hasActiveBranchReferences: jest.fn(),
    } as never;
    const p = new BranchPolicy(refs);
    expect(() =>
      p.assertScope(
        {
          organizationWide: false,
          authorizedBranchIds: [],
          accountId: 'a',
          permissionKeys: [],
        } as never,
        'b',
      ),
    ).toThrow(OutOfScopeException);
  });
  it('refuses archival with dependencies', async () => {
    const refs = {
      validateManager: jest.fn(),
      countActiveBranchReferences: jest.fn().mockResolvedValue(1),
    } as never;
    const p = new BranchPolicy(refs);
    await expect(p.assertTransition('b', 'ARCHIVED')).rejects.toThrow(
      EntityInUseException,
    );
  });
});
