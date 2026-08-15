import type { OrganizationMasterDataPort } from '../../../src/modules/organization/types/organization-master-data.port';
describe('downstream master-data boundary', () => {
  it('allows consumers to depend on the public port only', async () => {
    const port: OrganizationMasterDataPort = {
      selectable: jest
        .fn()
        .mockResolvedValue([
          { id: 'b', code: 'MAIN', label: 'الرئيسي', active: true },
        ]),
      resolve: jest.fn().mockResolvedValue(null),
      selectableValues: jest.fn().mockResolvedValue([]),
      resolveValue: jest.fn().mockResolvedValue(null),
    };
    await expect(port.selectable('branch')).resolves.toEqual([
      { id: 'b', code: 'MAIN', label: 'الرئيسي', active: true },
    ]);
  });
});
