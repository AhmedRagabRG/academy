/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { EmployeesController } from '../../../src/modules/identity/employees/employees.controller';
const SWAGGER_API_RESPONSE = 'swagger/apiResponse';

describe('employee administration contract', () => {
  it.each([
    ['list', '/', 0],
    ['get', ':id', 0],
    ['permissions', ':id/effective-permissions', 0],
    ['create', '/', 1],
    ['update', ':id', 4],
    ['status', ':id/status', 4],
    ['reset', ':id/reset-password', 1],
  ] as const)('documents users.%s', (name, path, verb) => {
    const handler = EmployeesController.prototype[name];
    expect(Reflect.getMetadata(PATH_METADATA, handler) ?? '').toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(verb);
    expect(Reflect.getMetadata(SWAGGER_API_RESPONSE, handler)).toBeDefined();
  });
});
