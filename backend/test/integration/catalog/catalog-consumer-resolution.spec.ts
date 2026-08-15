import { CatalogOfferingService } from '../../../src/modules/catalog/products/catalog-offering.service';
describe('consumer product resolution', () => {
  it('resolves historical identities but selects only active offerings', async () => {
    const archived = {
      id: '1',
      code: 'P1',
      officialName: 'Program',
      status: 'ARCHIVED',
      productType: { identity: 'PROFESSIONAL_PROGRAM' },
    };
    const repo = {
      find: jest.fn().mockResolvedValue(archived),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const reader = new CatalogOfferingService(repo as never);
    expect((await reader.resolve('1'))?.status).toBe('ARCHIVED');
    expect(await reader.selectable()).toEqual([]);
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['ACTIVE'] }),
    );
  });
});
