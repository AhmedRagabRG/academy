import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationReferenceService } from '../identity/employees/organization-reference.service';
import { ORGANIZATION_REFERENCE_PORT } from './types/organization-reference.port';
import { LookupController } from './lookups/lookup.controller';
import { LookupPolicy } from './lookups/lookup.policy';
import { LookupRepository } from './lookups/lookup.repository';
import { LookupService } from './lookups/lookup.service';
import { OrganizationLookupsService } from './lookups/organization-lookups.service';
import { OrganizationProfileController } from './profile/organization-profile.controller';
import { OrganizationProfileRepository } from './profile/organization-profile.repository';
import { OrganizationProfileService } from './profile/organization-profile.service';
import { GeneralSettingsController } from './settings/general-settings.controller';
import { GeneralSettingsRepository } from './settings/general-settings.repository';
import { GeneralSettingsService } from './settings/general-settings.service';
import { ORGANIZATION_MASTER_DATA_PORT } from './types/organization-master-data.port';
import { OrganizationSettingsReferenceService } from './settings/organization-settings-reference.service';
import { ORGANIZATION_SETTINGS_PORT } from './types/organization-settings.port';

@Module({
  imports: [CoreModule, IdentityModule],
  controllers: [
    LookupController,
    OrganizationProfileController,
    GeneralSettingsController,
  ],
  providers: [
    LookupRepository,
    LookupPolicy,
    LookupService,
    OrganizationLookupsService,
    OrganizationProfileRepository,
    OrganizationProfileService,
    GeneralSettingsRepository,
    GeneralSettingsService,
    OrganizationSettingsReferenceService,
    {
      provide: ORGANIZATION_REFERENCE_PORT,
      useExisting: OrganizationReferenceService,
    },
    {
      provide: ORGANIZATION_MASTER_DATA_PORT,
      useExisting: OrganizationLookupsService,
    },
    {
      provide: ORGANIZATION_SETTINGS_PORT,
      useExisting: OrganizationSettingsReferenceService,
    },
  ],
  exports: [
    ORGANIZATION_REFERENCE_PORT,
    ORGANIZATION_MASTER_DATA_PORT,
    ORGANIZATION_SETTINGS_PORT,
    OrganizationLookupsService,
    GeneralSettingsService,
    LookupService,
    OrganizationProfileService,
  ],
})
export class OrganizationModule {}
