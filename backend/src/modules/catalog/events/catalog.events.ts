export enum CatalogEventName {
  ProductCreated = 'catalog.product.created',
  ProductUpdated = 'catalog.product.updated',
  ProductStatusChanged = 'catalog.product.status-changed',
  TaxonomyChanged = 'catalog.taxonomy.changed',
}
export type CatalogEventPayload = {
  name: CatalogEventName;
  productId?: string;
  actorId: string;
  version: number;
  changes?: string[];
  occurredAt: string;
};
