/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '../../../src/core/decorators/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../../src/core/decorators/require-permissions.decorator';
import { IdentityAuthController } from '../../../src/modules/identity/auth/auth.controller';
import { EmployeesController } from '../../../src/modules/identity/employees/employees.controller';
import { RolesController } from '../../../src/modules/identity/roles/roles.controller';

describe('identity security surface', () => {
  it('marks only login/session/refresh as public and keeps logout fail-closed', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        IdentityAuthController.prototype.login,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        IdentityAuthController.prototype.session,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        IdentityAuthController.prototype.refresh,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        IdentityAuthController.prototype.logout,
      ),
    ).not.toBe(true);
  });

  it('declares canonical permissions on every administrative operation', () => {
    for (const name of [
      'list',
      'get',
      'permissions',
      'create',
      'update',
      'status',
      'reset',
    ] as const)
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          EmployeesController.prototype[name],
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^settings\.(users|permissions)\./),
        ]),
      );
    for (const name of [
      'list',
      'get',
      'create',
      'update',
      'status',
      'permissions',
    ] as const)
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          RolesController.prototype[name],
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^settings\.(roles|permissions)\./),
        ]),
      );
  });
});
