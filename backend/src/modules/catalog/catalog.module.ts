import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { IdentityModule } from '../identity/identity.module';
import { CatalogIdentityReferenceService } from '../identity/employees/catalog-reference.service';
import { OrganizationModule } from '../organization/organization.module';
import { CatalogOrganizationReferenceService } from '../organization/types/catalog-organization.port';
import { CatalogLookupsController } from './lookups/catalog-lookups.controller';
import { CatalogLookupsService } from './lookups/catalog-lookups.service';
import { ProductController } from './products/product.controller';
import { ProductPolicy } from './products/product.policy';
import { ProductRepository } from './products/product.repository';
import { ProductService } from './products/product.service';
import {
  CATALOG_IDENTITY_PORT,
  CATALOG_ORGANIZATION_PORT,
} from './types/catalog-reference.port';
import { CATALOG_PUBLIC_PORT } from './types/catalog-public.port';
import { CatalogOfferingService } from './products/catalog-offering.service';
import { CatalogCapabilityService } from './products/catalog-capability.service';
import { CatalogSnapshotService } from './products/catalog-snapshot.service';
import { CatalogPublicService } from './products/catalog-public.service';
import { TaxonomyController } from './taxonomy/taxonomy.controller';
import { CategoryController } from './taxonomy/category.controller';
import { TaxonomyRepository } from './taxonomy/taxonomy.repository';
import { TaxonomyService } from './taxonomy/taxonomy.service';
@Module({
  imports: [CoreModule, IdentityModule, OrganizationModule],
  controllers: [
    ProductController,
    CatalogLookupsController,
    TaxonomyController,
    CategoryController,
  ],
  providers: [
    ProductRepository,
    ProductPolicy,
    ProductService,
    CatalogLookupsService,
    TaxonomyRepository,
    TaxonomyService,
    CatalogOfferingService,
    CatalogCapabilityService,
    CatalogSnapshotService,
    CatalogPublicService,
    {
      provide: CATALOG_IDENTITY_PORT,
      useExisting: CatalogIdentityReferenceService,
    },
    {
      provide: CATALOG_ORGANIZATION_PORT,
      useExisting: CatalogOrganizationReferenceService,
    },
    { provide: CATALOG_PUBLIC_PORT, useExisting: CatalogPublicService },
  ],
  exports: [
    CATALOG_PUBLIC_PORT,
    CatalogOfferingService,
    CatalogCapabilityService,
    CatalogSnapshotService,
  ],
})
export class CatalogModule {}
