/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RolesController } from '../../../src/modules/identity/roles/roles.controller';
import { PermissionsController } from '../../../src/modules/identity/roles/permissions.controller';
const SWAGGER_API_RESPONSE = 'swagger/apiResponse';

describe('role and permission HTTP contracts', () => {
  it.each([
    ['list', '/', 0],
    ['get', ':id', 0],
    ['create', '/', 1],
    ['update', ':id', 4],
    ['status', ':id/status', 4],
    ['permissions', ':id/permissions', 2],
  ] as const)('documents roles.%s', (name, path, verb) => {
    const handler = RolesController.prototype[name];
    expect(Reflect.getMetadata(PATH_METADATA, handler) ?? '').toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(verb);
    expect(Reflect.getMetadata(SWAGGER_API_RESPONSE, handler)).toBeDefined();
  });
  it('documents the bounded catalogue', () => {
    expect(
      Reflect.getMetadata(
        SWAGGER_API_RESPONSE,
        PermissionsController.prototype.catalogue,
      ),
    ).toBeDefined();
  });
});
