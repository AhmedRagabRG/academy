import { CATALOG_PUBLIC_PORT } from '../../../src/modules/catalog/types/catalog-public.port';
import { CatalogPublicService } from '../../../src/modules/catalog/products/catalog-public.service';
describe('Catalog public port', () => {
  it('exports one stable token and delegates safe reader capabilities', async () => {
    const offerings = {
      resolve: jest.fn().mockResolvedValue(null),
      selectable: jest.fn().mockResolvedValue([]),
    };
    const capabilities = {
      readiness: jest.fn().mockResolvedValue({ ready: false, issues: [] }),
      eligibility: jest
        .fn()
        .mockResolvedValue({ eligible: false, reasons: [] }),
    };
    const snapshots = {
      pricing: jest.fn().mockResolvedValue(null),
      snapshot: jest.fn().mockResolvedValue(Object.freeze({})),
    };
    const service = new CatalogPublicService(
      offerings as never,
      capabilities as never,
      snapshots as never,
    );
    expect(typeof CATALOG_PUBLIC_PORT).toBe('symbol');
    expect(await service.selectable()).toEqual([]);
    expect(await service.snapshot('missing')).toEqual({});
  });
});
