/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { OrganizationProfileController } from '../../../src/modules/organization/profile/organization-profile.controller';
describe('profile contract', () => {
  it.each([
    ['get', '/', 0],
    ['update', '/', 4],
  ] as const)('%s', (m, p, v) => {
    const h = OrganizationProfileController.prototype[m];
    expect(Reflect.getMetadata(PATH_METADATA, h) ?? '').toBe(p);
    expect(Reflect.getMetadata(METHOD_METADATA, h)).toBe(v);
    expect(Reflect.getMetadata('swagger/apiResponse', h)).toBeDefined();
  });
});
