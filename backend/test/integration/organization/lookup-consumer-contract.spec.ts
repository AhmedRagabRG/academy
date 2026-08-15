import { OrganizationLookupsService } from '../../../src/modules/organization/lookups/organization-lookups.service';
describe('lookup consumer contract', () => {
  it('projects repository-backed choices', async () => {
    const selectable = jest
      .fn()
      .mockResolvedValue([{ id: '1', code: 'online', name: 'عن بعد' }]);
    const repository = { selectable };
    const service = new OrganizationLookupsService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.selectableValues('study-modes')).resolves.toEqual([
      { id: '1', code: 'online', label: 'عن بعد', active: true },
    ]);
    expect(selectable).toHaveBeenCalledWith('study-modes');
  });
});
