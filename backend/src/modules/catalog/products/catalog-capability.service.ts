import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_ORGANIZATION_PORT,
  type CatalogOrganizationPort,
} from '../types/catalog-reference.port';
import { BATCHABLE } from '../types/catalog.types';
import { ProductPolicy } from './product.policy';
import { ProductRepository } from './product.repository';
@Injectable()
export class CatalogCapabilityService {
  constructor(
    private readonly repo: ProductRepository,
    private readonly policy: ProductPolicy,
    @Inject(CATALOG_ORGANIZATION_PORT)
    private readonly org: CatalogOrganizationPort,
  ) {}
  async readiness(id: string) {
    const x = await this.repo.find(id);
    return x
      ? this.policy.readiness(x)
      : {
          ready: false,
          issues: [
            { code: 'NOT_FOUND', field: 'id', message: 'Product not found' },
          ],
        };
  }
  async eligibility(id: string, branchId: string) {
    const x = await this.repo.find(id);
    if (!x) return { eligible: false, reasons: ['PRODUCT_NOT_FOUND'] };
    const branch = await this.org.resolve('branch', branchId);
    const reasons: string[] = [];
    if (x.status !== 'ACTIVE') reasons.push('PRODUCT_NOT_ACTIVE');
    if (!branch?.active) reasons.push('BRANCH_NOT_ACTIVE');
    if (!x.branches.some((b) => b.branchId === branchId))
      reasons.push('BRANCH_NOT_ASSIGNED');
    return { eligible: reasons.length === 0, reasons };
  }
  async batchability(id: string) {
    const x = await this.repo.find(id);
    return x ? BATCHABLE[x.productType.identity] : false;
  }
}
