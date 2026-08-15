/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { LookupController } from '../../../src/modules/organization/lookups/lookup.controller';
import { REQUIRED_PERMISSIONS_KEY } from '../../../src/core/decorators/require-permissions.decorator';
describe('organization master-data feed contract', () => {
  it('keeps the bounded settings feed guarded and documented', () => {
    const handler = LookupController.prototype.standards;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('lookups');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(0);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler)).toEqual([
      'settings.general.view',
    ]);
    expect(Reflect.getMetadata('swagger/apiResponse', handler)).toBeDefined();
  });
});
