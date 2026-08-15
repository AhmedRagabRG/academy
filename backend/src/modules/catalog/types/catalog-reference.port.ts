import type { CatalogInstructor, CatalogOption } from './catalog.types';

export const CATALOG_IDENTITY_PORT = Symbol('CATALOG_IDENTITY_PORT');
export const CATALOG_ORGANIZATION_PORT = Symbol('CATALOG_ORGANIZATION_PORT');

export interface CatalogIdentityPort {
  instructor(id: string): Promise<CatalogInstructor | null>;
  instructors(
    search?: string,
    page?: number,
    pageSize?: number,
  ): Promise<{
    items: CatalogInstructor[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
export interface CatalogOrganizationPort {
  organizationId(): Promise<string>;
  resolve(
    kind: 'branch' | 'department',
    id: string,
  ): Promise<CatalogOption | null>;
  options(kind: 'branch' | 'department'): Promise<CatalogOption[]>;
  category(id: string): Promise<CatalogOption | null>;
  categories(): Promise<CatalogOption[]>;
  lookup(group: string, id: string): Promise<CatalogOption | null>;
  lookupOptions(group: string): Promise<CatalogOption[]>;
}
