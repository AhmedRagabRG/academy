import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_IDENTITY_PORT,
  CATALOG_ORGANIZATION_PORT,
  type CatalogIdentityPort,
  type CatalogOrganizationPort,
} from '../types/catalog-reference.port';
@Injectable()
export class CatalogLookupsService {
  constructor(
    @Inject(CATALOG_IDENTITY_PORT)
    private readonly identity: CatalogIdentityPort,
    @Inject(CATALOG_ORGANIZATION_PORT)
    private readonly organization: CatalogOrganizationPort,
  ) {}
  instructors(search?: string, page?: number, pageSize?: number) {
    return this.identity.instructors(search, page, pageSize);
  }
  async all() {
    const [branches, departments, categories, studyModes, durationUnits] =
      await Promise.all([
        this.organization.options('branch'),
        this.organization.options('department'),
        this.organization.categories(),
        this.organization.lookupOptions('study-modes'),
        this.organization.lookupOptions('duration-units'),
      ]);
    return {
      branches,
      departments,
      categories,
      studyModes,
      durationUnits,
      currencies: ['EGP', 'SAR', 'USD'],
      productStatuses: ['DRAFT', 'ACTIVE', 'HIDDEN', 'CLOSED', 'ARCHIVED'],
    };
  }
}
