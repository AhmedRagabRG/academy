/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { IdentityAuthController } from '../../../src/modules/identity/auth/auth.controller';
const SWAGGER_API_RESPONSE = 'swagger/apiResponse';

describe('authentication HTTP contract', () => {
  it.each([
    ['login', 'login', 1, 200],
    ['session', 'session', 0, undefined],
    ['refresh', 'refresh', 1, 200],
    ['logout', 'logout', 1, 200],
  ] as const)('documents auth.%s', (method, path, verb, status) => {
    const handler = IdentityAuthController.prototype[method];
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(verb);
    expect(Reflect.getMetadata(SWAGGER_API_RESPONSE, handler)).toBeDefined();
    if (status)
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
  });
});
