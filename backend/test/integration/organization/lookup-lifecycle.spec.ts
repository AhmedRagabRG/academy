import { LookupPolicy } from '../../../src/modules/organization/lookups/lookup.policy';
import {
  EntityInUseException,
  OrganizationInvalidStateException,
} from '../../../src/core/exceptions';
describe('lookup lifecycle policy', () => {
  it('rejects self-parent cycles', async () => {
    const p = new LookupPolicy({} as never);
    await expect(p.assertGroupParent('same', 'same')).rejects.toThrow(
      OrganizationInvalidStateException,
    );
  });
  it('rejects archiving groups with live values', async () => {
    const p = new LookupPolicy({
      nonArchivedValueCount: jest.fn().mockResolvedValue(1),
      nonArchivedChildGroupCount: jest.fn(),
    } as never);
    await expect(p.assertGroupArchive('g', 'ARCHIVED')).rejects.toThrow(
      EntityInUseException,
    );
  });
});
