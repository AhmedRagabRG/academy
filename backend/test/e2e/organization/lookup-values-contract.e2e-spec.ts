/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { LookupController } from '../../../src/modules/organization/lookups/lookup.controller';
describe('lookup value contract', () => {
  it.each([
    ['standards', 'lookups', 0],
    ['values', 'lookups/:groupCode', 0],
    ['createValue', 'lookups/:groupCode', 1],
    ['value', 'lookups/:groupCode/:id', 0],
    ['updateValue', 'lookups/:groupCode/:id', 4],
    ['statusValue', 'lookups/:groupCode/:id/status', 4],
    ['reorder', 'lookups/:groupCode/order', 2],
  ] as const)('%s', (m, p, v) => {
    const h = LookupController.prototype[m];
    expect(Reflect.getMetadata(PATH_METADATA, h)).toBe(p);
    expect(Reflect.getMetadata(METHOD_METADATA, h)).toBe(v);
    expect(Reflect.getMetadata('swagger/apiResponse', h)).toBeDefined();
  });
});
