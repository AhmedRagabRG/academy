import type { BatchStatus } from '../../../../prisma/generated/client';
import type { Money } from '../../../shared/types/money';

export const BATCH_STATUSES = [
  'DRAFT',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'STUDYING',
  'GRADUATED',
  'ARCHIVED',
] as const;

export type CapacityStatus =
  'AVAILABLE' | 'NEARLY_FULL' | 'FULL' | 'OVER_CAPACITY';

export interface CapacityView {
  maximumStudents: number;
  currentStudents: number;
  availableSeats: number;
  status: CapacityStatus;
}

export interface BatchFinding {
  code: string;
  section: string;
  field: string;
  message: string;
}

export interface BatchReadiness {
  ready: boolean;
  batchVersion: number;
  findings: BatchFinding[];
}

export interface BatchEligibility {
  eligible: boolean;
  reasons: string[];
  availableSeats: number;
  financialRevisionId: string;
  batchVersion: number;
}

export interface BatchIdentityRecord {
  id: string;
  programId: string;
  code: string;
  name: string;
  status: BatchStatus;
  version: number;
  archived: boolean;
}

export interface BatchSelectionReference {
  batchId: string;
  programId: string;
  branchId: string;
  batchVersion: number;
  financialRevisionId: string;
  availableSeats: number;
  evaluationDate: string;
}

export interface ImmutableFinancialRevision {
  id: string;
  batchId: string;
  revisionNumber: number;
  programPrice: Money;
  registrationFee: Money;
  installmentsEnabled: boolean;
  sourceBatchVersion: number;
  createdAt: string;
}

export interface BatchSelectionOption extends BatchIdentityRecord {
  availableSeats: number;
  financialRevisionId: string;
}

export interface BatchSelectionSnapshot extends BatchSelectionReference {
  batch: BatchIdentityRecord;
  branchLabel: string;
  schedule: Record<string, string | null>;
  financialRevision: ImmutableFinancialRevision;
}
