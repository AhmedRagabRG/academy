/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { ProductController } from '../../../src/modules/catalog/products/product.controller';
describe('catalog security surface', () => {
  it.each([
    'list',
    'get',
    'create',
    'update',
    'status',
    'readiness',
    'eligibility',
    'lifecycle',
  ] as const)('%s is protected by an exact permission', (method) => {
    const required = Reflect.getMetadata(
      'requiredPermissions',
      ProductController.prototype[method],
    ) as string[] | undefined;
    expect(required?.length).toBeGreaterThan(0);
    expect(required?.every((key) => key.startsWith('catalog.'))).toBe(true);
  });
});
