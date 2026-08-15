import { Injectable } from '@nestjs/common';
import { BATCHABLE, type ProductPublicRecord } from '../types/catalog.types';
import { ProductRepository } from './product.repository';
@Injectable()
export class CatalogOfferingService {
  constructor(private readonly repo: ProductRepository) {}
  private map(
    x: NonNullable<Awaited<ReturnType<ProductRepository['find']>>>,
  ): ProductPublicRecord {
    return {
      id: x.id,
      organizationId: x.organizationId,
      code: x.code,
      name: x.officialName,
      status: x.status,
      productType: x.productType.identity,
      batchable: BATCHABLE[x.productType.identity],
    };
  }
  async resolve(id: string) {
    const x = await this.repo.find(id);
    return x ? this.map(x) : null;
  }
  async selectable() {
    const r = await this.repo.list({
      statuses: ['ACTIVE'],
      page: 1,
      pageSize: 100,
    });
    return r.items.map((x) => this.map(x));
  }
}
