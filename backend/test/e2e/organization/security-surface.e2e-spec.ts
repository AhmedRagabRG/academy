/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../../src/core/decorators/require-permissions.decorator';
import { LookupController } from '../../../src/modules/organization/lookups/lookup.controller';
import { OrganizationProfileController } from '../../../src/modules/organization/profile/organization-profile.controller';
import { GeneralSettingsController } from '../../../src/modules/organization/settings/general-settings.controller';
describe('organization security surface', () => {
  it('guards every exposed handler with an exact settings permission', () => {
    const handlers = [
      LookupController.prototype.standards,
      LookupController.prototype.reorder,
      OrganizationProfileController.prototype.update,
      GeneralSettingsController.prototype.update,
    ];
    for (const h of handlers) {
      const keys = Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, h) as string[];
      expect(keys).toHaveLength(1);
      expect(keys[0]).toMatch(/^settings\./);
    }
  });
});
