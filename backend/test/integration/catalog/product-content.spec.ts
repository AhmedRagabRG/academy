import { assertContiguous } from '../../../src/modules/catalog/types/catalog-normalization';
describe('ordered catalog content', () => {
  it('accepts only contiguous one-based positions', () => {
    expect(() => assertContiguous([1, 2, 3])).not.toThrow();
    expect(() => assertContiguous([1, 3])).toThrow();
  });
});
