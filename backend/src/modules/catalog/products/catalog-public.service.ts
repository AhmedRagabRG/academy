import { Injectable } from '@nestjs/common';
import type { CatalogPublicPort } from '../types/catalog-public.port';
import { CatalogCapabilityService } from './catalog-capability.service';
import { CatalogOfferingService } from './catalog-offering.service';
import { CatalogSnapshotService } from './catalog-snapshot.service';
@Injectable()
export class CatalogPublicService implements CatalogPublicPort {
  constructor(
    private readonly offerings: CatalogOfferingService,
    private readonly capabilities: CatalogCapabilityService,
    private readonly snapshots: CatalogSnapshotService,
  ) {}
  resolve(id: string) {
    return this.offerings.resolve(id);
  }
  selectable() {
    return this.offerings.selectable();
  }
  readiness(id: string) {
    return this.capabilities.readiness(id);
  }
  eligibility(id: string, branchId: string) {
    return this.capabilities.eligibility(id, branchId);
  }
  async pricing(id: string) {
    const value = await this.snapshots.pricing(id);
    if (!value) return null;
    return {
      basePrice: value.basePrice,
      registrationFees: value.registrationFees,
      certificateFees: value.certificateFees,
      trainingFees: value.trainingFees,
      cardFees: value.cardFees,
      examFees: value.examFees,
      additionalFees: value.additionalFees,
      discount: value.discount,
      scholarship: value.scholarship,
    };
  }
  snapshot(id: string) {
    return this.snapshots.snapshot(id);
  }
}
