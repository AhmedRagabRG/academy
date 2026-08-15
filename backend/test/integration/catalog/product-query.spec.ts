import { normalizeCatalogSearch } from '../../../src/modules/catalog/types/catalog-normalization';
describe('product query rules', () => {
  it('normalizes Arabic variants and defines the closed list vocabulary', () => {
    expect(normalizeCatalogSearch('إدارة')).toBe(
      normalizeCatalogSearch('اداره'),
    );
    expect([
      'typeIds',
      'categoryIds',
      'departmentIds',
      'branchIds',
      'statuses',
      'studyModeIds',
    ]).toHaveLength(6);
    expect(['name', 'code', 'price', 'updatedAt']).toContain('price');
  });
});
