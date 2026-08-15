import type {
  Money,
  ProductEligibility,
  ProductPublicRecord,
  ProductReadiness,
} from './catalog.types';
export const CATALOG_PUBLIC_PORT = Symbol('CATALOG_PUBLIC_PORT');
export interface CatalogPublicPort {
  resolve(id: string): Promise<ProductPublicRecord | null>;
  selectable(): Promise<ProductPublicRecord[]>;
  readiness(id: string): Promise<ProductReadiness>;
  eligibility(id: string, branchId: string): Promise<ProductEligibility>;
  pricing(id: string): Promise<Record<string, Money> | null>;
  snapshot(id: string): Promise<Readonly<Record<string, unknown>>>;
}
