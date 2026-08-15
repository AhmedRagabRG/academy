import { Injectable } from '@nestjs/common';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  reconcileRequirementKeys,
  type DocumentRequirementRule,
  type PolicyRequirementReconciliation,
} from './admission-document.policy';
import {
  AdmissionDocumentRepository,
  type AdmissionDocumentRecord,
} from './admission-document.repository';

export interface AdmissionDocumentPolicyDefinition {
  id: string;
  version: number;
  requirements: readonly DocumentRequirementRule[];
}

@Injectable()
export abstract class AdmissionDocumentPolicySource {
  abstract currentForAdmission(
    admissionId: string,
  ): Promise<AdmissionDocumentPolicyDefinition>;
}

@Injectable()
export class AdmissionDocumentPolicyService {
  constructor(
    private readonly repository: AdmissionDocumentRepository,
    private readonly policySource: AdmissionDocumentPolicySource,
  ) {}

  reconcile(
    existing: readonly AdmissionDocumentRecord[],
    next: AdmissionDocumentPolicyDefinition,
  ): PolicyRequirementReconciliation {
    return reconcileRequirementKeys(
      existing.map((item) => item.requirementKey),
      next.requirements.map((item) => item.stableKey),
    );
  }

  async refresh(
    admissionId: string,
    expectedVersion: number,
    caller: CallerContext,
  ): Promise<AdmissionDocumentRecord[]> {
    const policy = await this.policySource.currentForAdmission(admissionId);
    return this.repository.refreshPolicy({
      admissionId,
      expectedVersion,
      sourcePolicyId: policy.id,
      sourcePolicyVersion: policy.version,
      requirements: policy.requirements,
      actorId: caller.accountId,
    });
  }
}
