/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { ProfileController } from '../../../src/modules/identity/profile/profile.controller';
const SWAGGER_API_RESPONSE = 'swagger/apiResponse';

describe('self-profile contract', () => {
  it.each([
    ['get', 'profile', 0, undefined],
    ['update', 'profile', 4, undefined],
    ['changePassword', 'change-password', 1, 200],
  ] as const)('documents profile.%s', (name, path, verb, status) => {
    const handler = ProfileController.prototype[name];
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(verb);
    expect(Reflect.getMetadata(SWAGGER_API_RESPONSE, handler)).toBeDefined();
    if (status)
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
  });
});
