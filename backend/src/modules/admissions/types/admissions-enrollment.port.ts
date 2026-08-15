import type { AdmissionFinding, OfferingKind } from './admissions.types';

export const ADMISSIONS_ENROLLMENT_PORT = Symbol('ADMISSIONS_ENROLLMENT_PORT');

export interface EnrollmentHandoff {
  admissionId: string;
  admissionReference: string;
  admissionVersion: number;
  approvalSnapshotId: string;
  applicant: {
    applicantId: string;
    fullName: string;
    dateOfBirth: string;
    qualificationId: string;
    // Full identity, required because a Student record cannot be created from
    // name and birth date alone and Students may not read Applicant tables
    // (constitution Principle II).
    qualificationLabel: string;
    primaryPhone: string;
    guardianPhone?: string;
    nationalId?: string;
    alternativeIdentityReason?: string;
    address: string;
    graduationYear: number;
  };
  academic: {
    offeringKind: OfferingKind;
    offeringId: string;
    offeringVersion: number;
    batchId?: string;
    batchVersion?: number;
  };
  registrationBranchId: string;
  studyBranchId: string;
  departmentId: string;
  customerServiceEmployeeId: string;
  documentPolicySnapshotId: string;
  verifiedDocumentVersionIds: readonly string[];
  financialRevisionId: string;
  currency: string;
  precision: number;
  requiredAmountMinor: string;
}

export type EnrollmentReadinessResult =
  | { ready: true; handoff: EnrollmentHandoff }
  | { ready: false; findings: AdmissionFinding[] };

/**
 * The settled financial facts of an approval snapshot, readable after the
 * admission has already been enrolled.
 *
 * Readiness evaluation deliberately fails for an enrolled admission, so it
 * cannot serve this read. Student Finance needs the historical figures to copy
 * them once into its own immutable per-enrollment snapshot; nothing here can
 * change after approval, which is what keeps later catalog or batch pricing
 * changes away from an existing student account.
 */
export interface ApprovalFinancialSnapshot {
  approvalSnapshotId: string;
  admissionId: string;
  financialRevisionId: string;
  productPriceMinor: string;
  registrationFeesMinor: string;
  discountAmountMinor: string;
  requiredAmountMinor: string;
  currency: string;
  precision: number;
}

export interface AdmissionsEnrollmentPort {
  getEnrollmentReadiness(
    admissionId: string,
  ): Promise<EnrollmentReadinessResult>;
  /** Historical read; returns null when the snapshot does not exist. */
  getApprovalFinancialSnapshot(
    approvalSnapshotId: string,
  ): Promise<ApprovalFinancialSnapshot | null>;
  acknowledgeEnrollment(input: {
    admissionId: string;
    approvalSnapshotId: string;
    externalStudentReference: string;
    expectedVersion: number;
  }): Promise<{ admissionId: string; status: 'enrolled'; version: number }>;
}
