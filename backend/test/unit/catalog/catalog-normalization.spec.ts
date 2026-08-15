import {
  assertContiguous,
  assertHttpsUrl,
  minorToMoney,
  moneyToMinor,
  normalizeCatalogCode,
  normalizeCatalogSearch,
} from '../../../src/modules/catalog/types/catalog-normalization';
describe('catalog normalization primitives', () => {
  it('normalizes codes and Arabic search deterministically', () => {
    expect(normalizeCatalogCode(' prog 001 ')).toBe('PROG-001');
    expect(normalizeCatalogSearch('إدارة')).toBe(
      normalizeCatalogSearch('اداره'),
    );
  });
  it('round-trips exact Money without floating point', () => {
    expect(moneyToMinor('1250.05', 2)).toBe(125005n);
    expect(minorToMoney(125005n, 'EGP', 2)).toEqual({
      amount: '1250.05',
      currency: 'EGP',
      precision: 2,
    });
    expect(() => moneyToMinor('1.001', 2)).toThrow();
  });
  it('closes ordered collections and URLs', () => {
    expect(() => assertContiguous([1, 3])).toThrow();
    expect(() => assertHttpsUrl('http://unsafe.example')).toThrow();
    expect(() => assertHttpsUrl('https://safe.example/video')).not.toThrow();
  });
});
