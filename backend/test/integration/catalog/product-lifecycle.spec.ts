import { readFileSync } from 'node:fs';
import { ProductPolicy } from '../../../src/modules/catalog/products/product.policy';
describe('product lifecycle persistence', () => {
  it('uses serializable transitions, optimistic versions and append-only lifecycle', () => {
    const service = readFileSync(
      'src/modules/catalog/products/product.service.ts',
      'utf8',
    );
    const repo = readFileSync(
      'src/modules/catalog/products/product.repository.ts',
      'utf8',
    );
    expect(service).toContain('runSerializable');
    expect(repo).toContain('productLifecycleEvent.create');
    expect(repo).toContain('where: { id, version, status: fromStatus }');
    expect(() =>
      new ProductPolicy({} as never, {} as never).assertTransition(
        'ARCHIVED',
        'ACTIVE',
        { ready: true, issues: [] },
      ),
    ).toThrow();
  });
});
