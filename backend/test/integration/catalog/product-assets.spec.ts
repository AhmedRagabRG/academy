import { assertHttpsUrl } from '../../../src/modules/catalog/types/catalog-normalization';
describe('safe product assets', () => {
  it('accepts HTTPS descriptors and rejects paths/non-HTTPS values', () => {
    expect(() => assertHttpsUrl('https://cdn.example/image.png')).not.toThrow();
    expect(() => assertHttpsUrl('/Users/private/file.png')).toThrow();
    expect(() => assertHttpsUrl('http://cdn.example/image.png')).toThrow();
  });
});
