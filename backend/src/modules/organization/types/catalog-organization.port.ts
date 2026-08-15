import { Injectable } from '@nestjs/common';
import type { CatalogOrganizationPort } from '../../catalog/types/catalog-reference.port';
import { OrganizationLookupsService } from '../lookups/organization-lookups.service';
import { OrganizationProfileRepository } from '../profile/organization-profile.repository';

@Injectable()
export class CatalogOrganizationReferenceService implements CatalogOrganizationPort {
  constructor(
    private readonly masterData: OrganizationLookupsService,
    private readonly profile: OrganizationProfileRepository,
  ) {}
  async organizationId() {
    const organization = await this.profile.get();
    if (!organization) throw new Error('Organization is not initialized');
    return organization.id;
  }
  resolve(kind: 'branch' | 'department', id: string) {
    return this.masterData.resolve(kind, id);
  }
  options(kind: 'branch' | 'department') {
    return this.masterData.selectable(kind);
  }
  category(id: string) {
    return this.masterData.resolveValue('business-categories', id);
  }
  categories() {
    return this.masterData.selectableValues('business-categories');
  }
  lookup(group: string, id: string) {
    return this.masterData.resolveValue(group, id);
  }
  lookupOptions(group: string) {
    return this.masterData.selectableValues(group);
  }
}
