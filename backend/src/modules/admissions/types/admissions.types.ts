import type { Money } from '../../../shared/types/money';

export const ADMISSION_STATUSES = [
  'draft',
  'submitted',
  'under-review',
  'approved',
  'rejected',
  'enrolled',
  'archived',
] as const;
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

export const OFFERING_KINDS = [
  'professional-program',
  'professional-diploma',
  'training-course',
] as const;
export type OfferingKind = (typeof OFFERING_KINDS)[number];
export type ApplicantStatus = 'active' | 'archived';
export type EligibilityContext = 'selection' | 'submission' | 'approval';
export type FinancialSourceKind = 'catalog-offering' | 'program-batch';
export type DiscountMode = 'none' | 'percentage' | 'amount';
export type AdmissionDocumentState =
  'missing' | 'uploading' | 'pending' | 'verified' | 'rejected' | 'withdrawn';
export type DocumentVersionStatus = 'available' | 'failed' | 'withdrawn';
export type DocumentDecision = 'verified' | 'rejected';

export const TIMELINE_EVENT_KINDS = [
  'created',
  'applicant-updated',
  'notes-updated',
  'assignment-changed',
  'selection-changed',
  'financial-updated',
  'document-uploaded',
  'document-replaced',
  'document-withdrawn',
  'document-verified',
  'document-rejected',
  'document-policy-refreshed',
  'status-changed',
  'approved',
  'rejected',
  'archived',
  'enrolled',
] as const;
export type TimelineEventKind = (typeof TIMELINE_EVENT_KINDS)[number];

export interface AdmissionFinding {
  code: string;
  section:
    | 'applicant'
    | 'assignment'
    | 'academic'
    | 'financial'
    | 'documents'
    | 'workflow';
  field?: string;
  message: string;
}

export interface AdmissionReadiness {
  ready: boolean;
  action: 'submit' | 'approve' | 'enroll';
  admissionVersion: number;
  findings: AdmissionFinding[];
}

export interface AdmissionSelectionSnapshot {
  revisionId: string;
  revisionNumber: number;
  offeringId: string;
  offeringKind: OfferingKind;
  offeringVersion: number;
  offeringCode: string;
  offeringLabel: string;
  batchId?: string;
  batchVersion?: number;
  batchCode?: string;
  batchLabel?: string;
  registrationBranchId: string;
  registrationBranchLabel: string;
  studyBranchId: string;
  studyBranchLabel: string;
}

export interface AdmissionFinancialSnapshot {
  revisionId: string;
  revisionNumber: number;
  sourceKind: FinancialSourceKind;
  sourceId: string;
  sourceVersion: number;
  productPrice: Money;
  registrationFees: Money;
  discountMode: DiscountMode;
  discountPercentage?: string;
  discountAmount: Money;
  requiredAmount: Money;
}

export type SafeTimelineMetadataValue = string | number | boolean | null;
export type SafeTimelineMetadata = Readonly<
  Record<string, SafeTimelineMetadataValue>
>;

export interface AdmissionTimelineProjection {
  id: string;
  kind: TimelineEventKind;
  actorId: string;
  actorName: string;
  occurredAt: string;
  sourceVersion: number;
  resultVersion: number;
  metadata: SafeTimelineMetadata;
}

export interface AdmissionListProjection {
  id: string;
  reference: string;
  applicantId: string;
  applicantName: string;
  primaryPhone: string;
  status: AdmissionStatus;
  offeringId: string;
  offeringCode: string;
  offeringLabel: string;
  batchId?: string;
  batchCode?: string;
  batchLabel?: string;
  registrationBranchId: string;
  registrationBranchLabel: string;
  studyBranchId: string;
  studyBranchLabel: string;
  updatedAt: string;
  version: number;
}

export interface AdmissionPermissions {
  viewFinancials: boolean;
  viewDocuments: boolean;
  update: boolean;
  assign: boolean;
  manageAcademic: boolean;
  manageFinancials: boolean;
  archive: boolean;
  availableActions: string[];
}
