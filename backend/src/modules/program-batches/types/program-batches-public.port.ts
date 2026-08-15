import type { PageResult } from '../../../shared/types/pagination';
import type {
  BatchEligibility,
  BatchIdentityRecord,
  BatchReadiness,
  BatchSelectionOption,
  BatchSelectionReference,
  BatchSelectionSnapshot,
  ImmutableFinancialRevision,
} from './program-batch.types';

export const PROGRAM_BATCHES_PUBLIC_PORT = Symbol(
  'PROGRAM_BATCHES_PUBLIC_PORT',
);

export interface ProgramBatchesPublicPort {
  resolveHistorical(batchId: string): Promise<BatchIdentityRecord | null>;
  selectableForProgram(
    programId: string,
    branchId: string | undefined,
    evaluationDate: string,
    page: number,
    pageSize: number,
  ): Promise<PageResult<BatchSelectionOption>>;
  readiness(batchId: string): Promise<BatchReadiness>;
  eligibility(
    batchId: string,
    branchId: string,
    evaluationDate: string,
  ): Promise<BatchEligibility>;
  currentSelectionReference(
    batchId: string,
    branchId: string,
    evaluationDate: string,
  ): Promise<BatchSelectionReference>;
  resolveFinancialRevision(
    batchId: string,
    financialRevisionId: string,
  ): Promise<ImmutableFinancialRevision | null>;
  snapshotForSelection(
    batchId: string,
    branchId: string,
    evaluationDate: string,
  ): Promise<BatchSelectionSnapshot>;
}
