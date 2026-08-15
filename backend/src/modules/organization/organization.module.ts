import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationReferenceService } from '../identity/employees/organization-reference.service';
import { ORGANIZATION_REFERENCE_PORT } from './types/organization-reference.port';
import { BranchController } from './branches/branch.controller';
import { BranchPolicy } from './branches/branch.policy';
import { BranchRepository } from './branches/branch.repository';
import { BranchService } from './branches/branch.service';
import { DepartmentController } from './departments/department.controller';
import { DepartmentPolicy } from './departments/department.policy';
import { DepartmentRepository } from './departments/department.repository';
import { DepartmentService } from './departments/department.service';
import { AcademicCalendarPolicy } from './academic-calendar/academic-calendar.policy';
import { AcademicTermController } from './academic-calendar/academic-term.controller';
import { AcademicTermRepository } from './academic-calendar/academic-term.repository';
import { AcademicTermService } from './academic-calendar/academic-term.service';
import { AcademicYearController } from './academic-calendar/academic-year.controller';
import { AcademicYearRepository } from './academic-calendar/academic-year.repository';
import { AcademicYearService } from './academic-calendar/academic-year.service';
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
import { CatalogOrganizationReferenceService } from './types/catalog-organization.port';
import { OrganizationSettingsReferenceService } from './settings/organization-settings-reference.service';
import { ORGANIZATION_SETTINGS_PORT } from './types/organization-settings.port';
import { DocumentRequirementController } from './document-requirements/document-requirement.controller';
import { DocumentRequirementService } from './document-requirements/document-requirement.service';

@Module({
  imports: [CoreModule, IdentityModule],
  controllers: [
    BranchController,
    DepartmentController,
    AcademicYearController,
    AcademicTermController,
    LookupController,
    OrganizationProfileController,
    GeneralSettingsController,
    DocumentRequirementController,
  ],
  providers: [
    BranchRepository,
    BranchPolicy,
    BranchService,
    DepartmentRepository,
    DepartmentPolicy,
    DepartmentService,
    AcademicYearRepository,
    AcademicTermRepository,
    AcademicCalendarPolicy,
    AcademicYearService,
    AcademicTermService,
    LookupRepository,
    LookupPolicy,
    LookupService,
    OrganizationLookupsService,
    OrganizationProfileRepository,
    OrganizationProfileService,
    GeneralSettingsRepository,
    GeneralSettingsService,
    CatalogOrganizationReferenceService,
    OrganizationSettingsReferenceService,
    DocumentRequirementService,
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
    DocumentRequirementService,
    ORGANIZATION_REFERENCE_PORT,
    ORGANIZATION_MASTER_DATA_PORT,
    ORGANIZATION_SETTINGS_PORT,
    OrganizationLookupsService,
    GeneralSettingsService,
    CatalogOrganizationReferenceService,
    LookupService,
    OrganizationProfileService,
  ],
})
export class OrganizationModule {}
