import type {
  AcademicSelectionRevisionId,
  ActorRef,
  AdmissionApprovalSnapshotId,
  AdmissionDocumentId,
  AdmissionId,
  AdmissionStatus,
  ApplicantId,
  AuditContext,
  DocumentRequirementSnapshotId,
  DocumentState,
  DocumentVersionId,
  EligibilityAssessmentId,
  FinancialPreparationRevisionId,
  LocalizedText,
  LookupOption,
  Money,
  OfferingKind,
} from "./common"

export interface Applicant extends AuditContext {
  id: ApplicantId
  organizationId: string
  fullName: string
  primaryPhone: string
  guardianPhone?: string
  nationalId?: string
  alternativeIdentityReason?: string
  address: string
  dateOfBirth: string
  qualificationId: string
  qualificationLabel: string
  graduationYear: number
  notes: string
  profileImageUrl?: string
  status: "active" | "archived"
}

export interface AdmissionAssignment {
  registrationBranchId: string
  registrationBranchLabel: string
  studyBranchId: string
  studyBranchLabel: string
  admissionsEmployeeId: string
  admissionsEmployeeName: string
  customerServiceEmployeeId: string
  customerServiceEmployeeName: string
  customerServiceManagerId: string
  customerServiceManagerName: string
  departmentId: string
  departmentLabel: string
  leadSourceId: string
  leadSourceLabel: string
  academicGradeId?: string
  academicGradeLabel?: string
}

export type EligibilityReason =
  | "offering-inactive"
  | "batch-required"
  | "batch-forbidden"
  | "batch-parent-mismatch"
  | "registration-not-open"
  | "outside-registration-window"
  | "no-seats"
  | "registration-branch-unavailable"
  | "study-branch-unavailable"

export interface EligibilityAssessment {
  id: EligibilityAssessmentId
  context: "selection" | "submission" | "approval"
  eligible: boolean
  reasons: EligibilityReason[]
  evaluatedAt: string
  evaluatedOn: string
  availableSeats?: number
  offeringVersion: number
  batchVersion?: number
}

export interface AcademicSelectionRevision {
  id: AcademicSelectionRevisionId
  revisionNumber: number
  offeringKind: OfferingKind
  offeringId: string
  offeringVersion: number
  offeringLabel: string
  offeringCode: string
  batchId?: string
  batchVersion?: number
  batchLabel?: string
  batchCode?: string
  batchFinancialRevisionId?: string
  /**
   * The assessment made when this revision was recorded.
   *
   * Optional because the API does not store an assessment per revision — it
   * evaluates eligibility on demand against today's date. A revision read back
   * from the server therefore carries none, and inventing one would assert an
   * evaluation that never happened.
   */
  eligibility?: EligibilityAssessment
  changeReason?: string
  createdAt: string
  createdBy: string
}

export interface DocumentRequirement {
  id: string
  key: string
  label: string
  required: boolean
  requiredAt: "submission" | "approval"
  allowedMimeTypes: string[]
  maxBytes: number
}

export interface DocumentRequirementSnapshot {
  id: DocumentRequirementSnapshotId
  policyId: string
  policyVersion: number
  selectionRevisionId?: AcademicSelectionRevisionId
  requirements: DocumentRequirement[]
  createdAt: string
}

export interface DocumentVersion {
  id: DocumentVersionId
  versionNumber: number
  fileName: string
  mimeType: string
  size: number
  previewUrl?: string
  status: "available" | "failed" | "withdrawn"
  uploadedAt: string
  uploadedBy: string
}

export interface DocumentVerificationDecision {
  id: string
  documentVersionId: DocumentVersionId
  decision: "verified" | "rejected"
  reason?: string
  reviewer: ActorRef
  decidedAt: string
}

export interface AdmissionDocument {
  id: AdmissionDocumentId
  requirement: DocumentRequirement
  state: DocumentState
  currentVersion?: DocumentVersion
  versions: DocumentVersion[]
  decisions: DocumentVerificationDecision[]
}

export interface FinancialPreparationRevision {
  id: FinancialPreparationRevisionId
  revisionNumber: number
  sourceKind: "catalog-offering" | "program-batch"
  sourceId: string
  sourceVersion: number
  sourceFinancialRevisionId: string
  productPrice: Money
  registrationFees: Money
  discountMode: "none" | "percentage" | "amount"
  discountPercentage: string
  discountAmount: Money
  requiredAmount: Money
  reason?: string
  createdAt: string
  createdBy: string
}

export interface AdmissionLifecycleEvent {
  id: string
  fromStatus: AdmissionStatus | null
  toStatus: AdmissionStatus
  reason?: string
  actor: ActorRef
  occurredAt: string
  sourceVersion: number
  resultVersion: number
}

export interface AdmissionApprovalSnapshot {
  id: AdmissionApprovalSnapshotId
  admissionId: AdmissionId
  applicantId: ApplicantId
  selection: AcademicSelectionRevision
  assignment: AdmissionAssignment
  verifiedDocumentVersionIds: DocumentVersionId[]
  requirementSnapshotId: DocumentRequirementSnapshotId
  financial: FinancialPreparationRevision
  approvedAt: string
  approvedBy: ActorRef
}

export interface Admission extends AuditContext {
  id: AdmissionId
  reference: string
  organizationId: string
  applicantId: ApplicantId
  status: AdmissionStatus
  assignment: AdmissionAssignment
  selection?: AcademicSelectionRevision
  financial?: FinancialPreparationRevision
  requirementSnapshot: DocumentRequirementSnapshot
  documents: AdmissionDocument[]
  approvalSnapshot?: AdmissionApprovalSnapshot
  externalEnrollmentReference?: string
  notes: string
  activeReviewer?: ActorRef
  lifecycle: AdmissionLifecycleEvent[]
  financialHistory: FinancialPreparationRevision[]
  selectionHistory: AcademicSelectionRevision[]
}

export interface ReadinessFinding {
  code: string
  section: string
  field?: string
  message: string
  severity: "error" | "warning"
}

export interface AdmissionReadiness {
  ready: boolean
  action: "submit" | "approve"
  admissionVersion: number
  findings: ReadinessFinding[]
  documentCounts: {
    required: number
    missing: number
    pending: number
    rejected: number
    verified: number
  }
  availableActions: AdmissionStatus[]
}

export interface AdmissionSummary {
  id: AdmissionId
  reference: string
  applicantName: string
  phoneHint: string
  offeringLabel: string
  offeringCode: string
  batchLabel?: string
  batchCode?: string
  registrationBranch: string
  assignedEmployee: string
  status: AdmissionStatus
  updatedAt: string
  version: number
}

export interface AdmissionDetail extends Admission {
  applicant: Applicant
  readiness: AdmissionReadiness
}

export interface EnrollmentReadinessSummary {
  ready: boolean
  reasons: string[]
  admissionId: AdmissionId
  admissionReference: string
  admissionVersion: number
  status: AdmissionStatus
  approvalSnapshotId?: AdmissionApprovalSnapshotId
  applicant?: { id: ApplicantId; name: string; phone: string }
  academicTarget?: {
    kind: OfferingKind
    offeringId: string
    offeringVersion: number
    batchId?: string
    batchVersion?: number
  }
  branches?: { registrationBranchId: string; studyBranchId: string }
  financial?: {
    revisionId: FinancialPreparationRevisionId
    currency: string
    requiredAmount: string
  }
}

export interface AdmissionLookups {
  branches: LookupOption[]
  employees: LookupOption[]
  managers: LookupOption[]
  departments: LookupOption[]
  leadSources: LookupOption[]
  academicGrades: LookupOption[]
  qualifications: LookupOption[]
  offerings: AdmissionOffering[]
  batches: AdmissionBatchOption[]
  documentPolicy: DocumentRequirementSnapshot
  currency: string
  precision: number
}

export interface AdmissionOffering {
  id: string
  version: number
  kind: OfferingKind
  name: LocalizedText
  code: string
  status: "active" | "inactive" | "archived"
  branchIds: string[]
  /** Branches the product accepts registrations at; absent means unpublished. */
  registrationBranchIds?: string[]
  /** Branches the product is taught at; absent means unpublished. */
  studyBranchIds?: string[]
  price: Money
  registrationFees: Money
  pricingRevisionId: string
  documentPolicyId: string
}

export interface AdmissionBatchOption {
  id: string
  programId: string
  version: number
  name: string
  code: string
  status: "registration-open" | "registration-closed" | "draft"
  registrationBranchIds: string[]
  studyBranchIds: string[]
  availableSeats: number
  registrationStartDate: string
  registrationEndDate: string
  financialRevisionId: string
  price: Money
  registrationFees: Money
}
