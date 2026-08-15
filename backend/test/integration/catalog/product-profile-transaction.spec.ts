import { readFileSync } from 'node:fs';
describe('aggregate transaction boundary', () => {
  it('replaces every owned section inside one transaction before emitting', () => {
    const source = readFileSync(
      'src/modules/catalog/products/product.service.ts',
      'utf8',
    );
    expect(source).toContain('this.transactions.run');
    expect(source).toContain('replaceChildren');
    expect(source.indexOf('replaceChildren')).toBeLessThan(
      source.lastIndexOf('this.emit'),
    );
  });
});
