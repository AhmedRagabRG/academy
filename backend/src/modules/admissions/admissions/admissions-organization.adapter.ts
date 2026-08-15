import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import {
  ORGANIZATION_SETTINGS_PORT,
  type OrganizationSettingsPort,
} from '../../organization/types/organization-settings.port';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import type {
  AdmissionsOption,
  AdmissionsOrganizationPort,
} from '../types/admissions-reference.port';

@Injectable()
export class AdmissionsOrganizationAdapter implements AdmissionsOrganizationPort {
  constructor(
    private readonly profile: OrganizationProfileService,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly masterData: OrganizationMasterDataPort,
    @Inject(ORGANIZATION_SETTINGS_PORT)
    private readonly settings: OrganizationSettingsPort,
  ) {}

  async organizationId() {
    return (await this.profile.get()).organizationId;
  }

  async resolve(kind: 'branch' | 'department', id: string) {
    return this.option(await this.masterData.resolve(kind, id));
  }

  async resolveLookup(
    kind: 'qualification' | 'lead-source' | 'academic-grade',
    id: string,
  ) {
    const groups = {
      qualification: 'qualifications',
      'lead-source': 'lead-sources',
      'academic-grade': 'academic-grades',
    } as const;
    return this.option(await this.masterData.resolveValue(groups[kind], id));
  }

  identityRules() {
    return Promise.resolve({
      minorAge: 18,
      minimumGraduationAge: 16,
      nationalIdPattern: '^\\d{14}$',
      phonePattern: '^01\\d{9}$',
    });
  }

  currency() {
    return this.settings.financialDefaults();
  }

  private option(
    value: Awaited<ReturnType<OrganizationMasterDataPort['resolve']>>,
  ): AdmissionsOption | null {
    return value
      ? {
          id: value.id,
          code: value.code,
          label: value.label,
          active: value.active,
          disabledReason: value.disabledReason,
        }
      : null;
  }
}
