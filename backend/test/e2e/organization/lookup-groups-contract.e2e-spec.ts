/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { LookupController } from '../../../src/modules/organization/lookups/lookup.controller';
describe('lookup group contract', () => {
  it.each([
    ['groups', 'lookup-groups', 0],
    ['createGroup', 'lookup-groups', 1],
    ['group', 'lookup-groups/:id', 0],
    ['updateGroup', 'lookup-groups/:id', 4],
    ['statusGroup', 'lookup-groups/:id/status', 4],
  ] as const)('%s', (m, p, v) => {
    const h = LookupController.prototype[m];
    expect(Reflect.getMetadata(PATH_METADATA, h)).toBe(p);
    expect(Reflect.getMetadata(METHOD_METADATA, h)).toBe(v);
    expect(Reflect.getMetadata('swagger/apiResponse', h)).toBeDefined();
  });
});
