import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_PUBLIC_PORT,
  type CatalogPublicPort,
} from '../../catalog/types/catalog-public.port';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import {
  ORGANIZATION_SETTINGS_PORT,
  type OrganizationSettingsPort,
} from '../../organization/types/organization-settings.port';

@Injectable()
export class BatchLookupsService {
  constructor(
    @Inject(CATALOG_PUBLIC_PORT)
    private readonly catalog: CatalogPublicPort,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
    @Inject(ORGANIZATION_SETTINGS_PORT)
    private readonly settings: OrganizationSettingsPort,
  ) {}

  async get(programId: string) {
    const [
      program,
      academicYears,
      intakes,
      branches,
      defaults,
      pricingDefaults,
    ] = await Promise.all([
      this.catalog.resolve(programId),
      this.organization.selectable('academicYear'),
      this.organization.selectableValues('program-intakes'),
      this.organization.selectable('branch'),
      this.settings.financialDefaults(),
      this.catalog.pricing(programId),
    ]);
    return {
      program: program && {
        id: program.id,
        code: program.code,
        label: program.name,
        active: program.status === 'ACTIVE',
        batchingEligible: program.batchable,
      },
      academicYears,
      intakes,
      branches,
      scheduleMilestones: [
        'registration-start',
        'registration-end',
        'study-start',
        'study-end',
        'graduation',
      ],
      financialDefaults: defaults,
      pricingDefaults,
    };
  }
}
