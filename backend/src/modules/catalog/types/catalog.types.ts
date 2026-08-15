import type {
  ProductStatus,
  ProductTypeIdentity,
} from '../../../../prisma/generated/client';

export type CatalogOption = {
  id: string;
  code?: string;
  label: string;
  active: boolean;
  disabledReason?: 'inactive' | 'archived';
};
export type Money = { amount: string; currency: string; precision: number };
export type CatalogInstructor = CatalogOption & {
  departmentId?: string;
  position?: string;
};
export type ProductReadinessIssue = {
  code: string;
  field: string;
  message: string;
};
export type ProductReadiness = {
  ready: boolean;
  issues: ProductReadinessIssue[];
};
export type ProductEligibility = { eligible: boolean; reasons: string[] };
export type ProductTypeRecord = {
  id: string;
  identity: ProductTypeIdentity;
  name: string;
  description: string | null;
  batchable: boolean;
  status: string;
  version: number;
};
export type ProductPublicRecord = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  status: ProductStatus;
  productType: ProductTypeIdentity;
  batchable: boolean;
};

export const CATALOG_PERMISSIONS = Object.freeze({
  productsView: 'catalog.products.view',
  productsCreate: 'catalog.products.create',
  productsUpdate: 'catalog.products.update',
  productsStatus: 'catalog.products.status',
  productsPricing: 'catalog.products.pricing',
  productsMedia: 'catalog.products.media',
  typesView: 'catalog.types.view',
  typesUpdate: 'catalog.types.update',
  categoriesView: 'catalog.categories.view',
  categoriesUpdate: 'catalog.categories.update',
});

export const BATCHABLE: Readonly<Record<ProductTypeIdentity, boolean>> =
  Object.freeze({
    PROFESSIONAL_PROGRAM: true,
    PROFESSIONAL_DIPLOMA: false,
    TRAINING_COURSE: false,
  });
