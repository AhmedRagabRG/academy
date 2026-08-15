import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ProductController } from '../../../src/modules/catalog/products/product.controller';
import { TaxonomyController } from '../../../src/modules/catalog/taxonomy/taxonomy.controller';
import { CategoryController } from '../../../src/modules/catalog/taxonomy/category.controller';
import { CatalogLookupsController } from '../../../src/modules/catalog/lookups/catalog-lookups.controller';
describe('academic catalog route contract', () => {
  it.each([
    [ProductController, 'list', '/', 0],
    [ProductController, 'get', ':id', 0],
    [ProductController, 'create', '/', 1],
    [ProductController, 'update', ':id', 4],
    [ProductController, 'status', ':id/status', 4],
    [ProductController, 'readiness', ':id/readiness', 0],
    [ProductController, 'eligibility', ':id/eligibility', 0],
    [ProductController, 'lifecycle', ':id/lifecycle', 0],
    [TaxonomyController, 'list', '/', 0],
    [TaxonomyController, 'get', ':id', 0],
    [TaxonomyController, 'update', ':id', 4],
    [TaxonomyController, 'status', ':id/status', 4],
    [CategoryController, 'list', '/', 0],
    [CategoryController, 'get', ':id', 0],
    [CategoryController, 'create', '/', 1],
    [CategoryController, 'update', ':id', 4],
    [CategoryController, 'status', ':id/status', 4],
    [CatalogLookupsController, 'instructors', 'instructors', 0],
    [CatalogLookupsController, 'all', 'lookups', 0],
  ] as const)(
    '%p.%s exposes the documented path, method, permission and Swagger response',
    (controller, method, path, verb) => {
      const prototype = controller.prototype as unknown as Record<
        string,
        unknown
      >;
      const handler = prototype[method];
      expect(typeof handler).toBe('function');
      if (typeof handler !== 'function') throw new Error('Missing handler');
      expect(Reflect.getMetadata(PATH_METADATA, handler) ?? '').toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(verb);
      expect(Reflect.getMetadata('requiredPermissions', handler)).toBeDefined();
      expect(Reflect.getMetadata('swagger/apiResponse', handler)).toBeDefined();
    },
  );
  it('does not expose a Product Type create route or permission', () => {
    expect('create' in TaxonomyController.prototype).toBe(false);
  });
});
