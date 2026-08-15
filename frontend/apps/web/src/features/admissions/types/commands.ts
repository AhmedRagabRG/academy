import type {
  AdmissionDocumentId,
  AdmissionId,
  AdmissionStatus,
  ApplicantId,
  DocumentVersionId,
  OfferingKind,
} from "./common"

export interface ApplicantInput {
  fullName: string
  primaryPhone: string
  guardianPhone?: string
  nationalId?: string
  alternativeIdentityReason?: string
  address: string
  dateOfBirth: string
  qualificationId: string
  graduationYear: number
  notes: string
  profileImageUrl?: string
}

export interface AssignmentInput {
  registrationBranchId: string
  studyBranchId: string
  admissionsEmployeeId: string
  customerServiceEmployeeId: string
  customerServiceManagerId: string
  departmentId: string
  leadSourceId: string
  academicGradeId?: string
}

export interface AcademicSelectionInput {
  offeringKind: OfferingKind
  offeringId: string
  batchId?: string
}

export interface FinancialInput {
  discountMode: "none" | "percentage" | "amount"
  discountValue: string
  reason?: string
}

export interface DraftAdmissionInput {
  applicant: ApplicantInput
  assignment: AssignmentInput
  selection?: AcademicSelectionInput
  financial?: FinancialInput
  notes: string
}

export interface AdmissionListQuery {
  search?: string
  branchId?: string
  offeringId?: string
  batchId?: string
  status?: AdmissionStatus | "all"
  admissionsEmployeeId?: string
  customerServiceEmployeeId?: string
  customerServiceManagerId?: string
  sort?: "updatedAt" | "applicantName" | "reference" | "status"
  direction?: "asc" | "desc"
  page: number
  pageSize: number
}

export interface DuplicateResolutionInput {
  outcome: "use-existing" | "create-exception"
  applicantId?: ApplicantId
  reason?: string
}

export interface CreateDraftCommand {
  input: DraftAdmissionInput
  duplicateResolution?: DuplicateResolutionInput
}

export interface UpdateDraftCommand {
  admissionId: AdmissionId
  input: DraftAdmissionInput
  expectedVersion: number
}

export interface ChangeSelectionCommand {
  admissionId: AdmissionId
  selection: AcademicSelectionInput
  confirmedConsequences: string[]
  reason?: string
  expectedVersion: number
}

export interface PrepareFinancialsCommand {
  admissionId: AdmissionId
  input: FinancialInput
  expectedVersion: number
}

export interface DocumentFileInput {
  name: string
  type: string
  size: number
  previewUrl?: string
  /**
   * The bytes to upload.
   *
   * The API stores the file itself, so the metadata above — which the UI keeps
   * for its preview — is not enough to complete an upload. Optional because
   * the in-memory fixtures never read it.
   */
  blob?: File
}

export interface UploadDocumentCommand {
  admissionId: AdmissionId
  requirementId: string
  file: DocumentFileInput
  idempotencyKey: string
  expectedVersion: number
}

export interface ReplaceDocumentCommand extends UploadDocumentCommand {
  documentId: AdmissionDocumentId
  reason: string
}

export interface WithdrawDocumentCommand {
  admissionId: AdmissionId
  documentId: AdmissionDocumentId
  versionId: DocumentVersionId
  reason: string
  expectedVersion: number
}

export interface VerifyDocumentCommand {
  admissionId: AdmissionId
  documentId: AdmissionDocumentId
  versionId: DocumentVersionId
  decision: "verified" | "rejected"
  reason?: string
  expectedVersion: number
}

export interface TransitionAdmissionCommand {
  admissionId: AdmissionId
  toStatus: AdmissionStatus
  reason?: string
  expectedVersion: number
}

export interface ArchiveApplicantCommand {
  applicantId: ApplicantId
  reason: string
  expectedVersion: number
}

export interface BulkTransitionCommand {
  items: TransitionAdmissionCommand[]
}

export interface BulkTransitionOutcome {
  admissionId: AdmissionId
  success: boolean
  message?: string
}
