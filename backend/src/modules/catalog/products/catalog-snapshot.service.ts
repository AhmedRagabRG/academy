import { Injectable } from '@nestjs/common';
import { mapProduct } from '../mappers/catalog.mapper';
import { ProductRepository } from './product.repository';
@Injectable()
export class CatalogSnapshotService {
  constructor(private readonly repo: ProductRepository) {}
  async pricing(id: string) {
    const x = await this.repo.find(id);
    return x ? mapProduct(x).pricing : null;
  }
  async snapshot(id: string) {
    const x = await this.repo.find(id);
    if (!x) return Object.freeze({});
    return Object.freeze(
      JSON.parse(JSON.stringify(mapProduct(x))) as Record<string, unknown>,
    );
  }
}
