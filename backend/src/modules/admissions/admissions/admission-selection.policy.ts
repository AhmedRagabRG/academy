import { Injectable } from '@nestjs/common';
import type {
  AdmissionBatchReference,
  AdmissionOfferingReference,
} from '../types/admissions-reference.port';

export interface SelectionAssessmentInput {
  offering: AdmissionOfferingReference;
  batch: AdmissionBatchReference | null;
  registrationBranchId: string;
  studyBranchId: string;
}

export interface SelectionAssessment {
  eligible: boolean;
  reasons: string[];
}

export type SelectionConsequence =
  'financial-recalculated' | 'documents-repolicied';

@Injectable()
export class AdmissionSelectionPolicy {
  assess(input: SelectionAssessmentInput): SelectionAssessment {
    const reasons: string[] = [];
    const { offering, batch } = input;
    if (!offering.active) reasons.push('offering-inactive');
    if (offering.kind === 'professional-program') {
      if (!batch) reasons.push('batch-required');
      else {
        if (batch.programId !== offering.id)
          reasons.push('batch-program-mismatch');
        if (!batch.active) reasons.push('batch-inactive');
        if (!batch.registrationOpen) reasons.push('batch-registration-closed');
        if (batch.availableSeats <= 0) reasons.push('batch-full');
        if (!batch.registrationBranchIds.includes(input.registrationBranchId))
          reasons.push('batch-registration-branch-ineligible');
        if (!batch.studyBranchIds.includes(input.studyBranchId))
          reasons.push('batch-study-branch-ineligible');
      }
    } else if (batch) reasons.push('batch-forbidden');
    if (!offering.registrationBranchIds.includes(input.registrationBranchId))
      reasons.push('offering-registration-branch-ineligible');
    if (!offering.studyBranchIds.includes(input.studyBranchId))
      reasons.push('offering-study-branch-ineligible');
    return { eligible: reasons.length === 0, reasons: [...new Set(reasons)] };
  }

  consequences(
    previous: AdmissionOfferingReference,
    next: AdmissionOfferingReference,
  ): SelectionConsequence[] {
    const consequences: SelectionConsequence[] = ['financial-recalculated'];
    if (
      previous.documentPolicyId !== next.documentPolicyId ||
      previous.documentPolicyVersion !== next.documentPolicyVersion
    )
      consequences.push('documents-repolicied');
    return consequences;
  }

  confirmed(
    required: readonly SelectionConsequence[],
    supplied: readonly SelectionConsequence[],
  ): boolean {
    const confirmations = new Set(supplied);
    return required.every((item) => confirmations.has(item));
  }
}
