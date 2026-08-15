import type {
  ActorRef,
  AuditContext,
  DocumentState,
  EnrollmentStatus,
  LookupOption,
  Money,
  OfferingKind,
  StudentDocumentId,
  StudentDocumentTypeKey,
  StudentDocumentVersionId,
  StudentEnrollmentId,
  StudentId,
  StudentNoteId,
  StudentStatus,
  StudentStatusChangeId,
  StudentTimelineEventId,
  TimelineCategory,
  TimelineOrigin,
} from "./common"

/** Maintainable personal facts. */
export interface StudentIdentity {
  fullName: string
  primaryPhone: string
  /**
   * Not editable in this UI, but carried so a profile save round-trips it. The
   * API rewrites the whole identity block from the submitted payload, so an
   * omitted guardian name is stored as "cleared" rather than "unchanged".
   */
  guardianName?: string
  guardianPhone?: string
  nationalId?: string
  /** Required when `nationalId` is absent (spec FR-004). */
  alternativeIdentityReason?: string
  address: string
  dateOfBirth: string
  qualificationId: string
  qualificationLabel: string
  graduationYear: number
  profileImageUrl?: string
}

/** Operational and academic ownership. */
export interface StudentAssignment {
  registrationBranchId: string
  registrationBranchLabel: string
  studyBranchId: string
  studyBranchLabel: string
  departmentId: string
  departmentLabel: string
  academicGradeId?: string
  academicGradeLabel?: string
  customerServiceEmployeeId: string
  customerServiceEmployeeName: string
}

/** Protected facts carried from the admission decision; never editable here. */
export interface StudentSystemInfo {
  admissionId: string
  admissionReference: string
  /** Intake idempotency key (spec FR-003). */
  approvalSnapshotId: string
  admissionDate: string
  enrollmentDate: string
}

export interface StudentStatusChange {
  id: StudentStatusChangeId
  /** `null` only for the intake-created initial state. */
  fromStatus: StudentStatus | null
  toStatus: StudentStatus
  reason?: string
  actor: ActorRef
  occurredAt: string
  sourceVersion: number
  resultVersion: number
}

/** The aggregate root. Produced only by intake; never deleted. */
export interface Student extends AuditContext {
  id: StudentId
  organizationId: string
  /** Unique per organization, service-allocated, protected. */
  studentCode: string
  status: StudentStatus
  identity: StudentIdentity
  assignment: StudentAssignment
  system: StudentSystemInfo
  statusHistory: StudentStatusChange[]
  archivedAt?: string
  archiveReason?: string
}

/** Read-only academic engagement. Written only by the intake port. */
export interface StudentEnrollment {
  id: StudentEnrollmentId
  studentId: StudentId
  offeringKind: OfferingKind
  offeringId: string
  offeringVersionAtEnrollment: number
  /** Denormalized at intake so archival in the catalog never blanks history. */
  offeringLabel: string
  offeringCode: string
  batchId?: string
  batchVersionAtEnrollment?: number
  batchLabel?: string
  batchCode?: string
  registrationBranchLabel: string
  studyBranchLabel: string
  enrollmentDate: string
  status: EnrollmentStatus
  sourceAdmissionId: string
}

export interface StudentDocumentType {
  key: StudentDocumentTypeKey
  label: string
  required: boolean
  multiple: boolean
  allowedMimeTypes: string[]
  maxBytes: number
}

export interface StudentDocumentVersion {
  id: StudentDocumentVersionId
  versionNumber: number
  fileName: string
  mimeType: string
  size: number
  previewUrl?: string
  uploadedAt: string
  uploadedBy: ActorRef
  /** Retry-safety key: a repeated attempt resolves to this version. */
  uploadAttemptId: string
}

export interface StudentDocument {
  id: StudentDocumentId
  studentId: StudentId
  type: StudentDocumentType
  state: DocumentState
  currentVersionId?: StudentDocumentVersionId
  /** Append-only. Replacement adds a version; nothing is ever removed. */
  versions: StudentDocumentVersion[]
  archivedAt?: string
  archivedBy?: ActorRef
  archiveReason?: string
}

export interface StudentNote {
  id: StudentNoteId
  studentId: StudentId
  content: string
  /** Preserved even when `author.active` becomes false. */
  author: ActorRef
  createdAt: string
  editedAt?: string
  editedBy?: ActorRef
  archivedAt?: string
  archivedBy?: ActorRef
}

export interface StudentTimelineEvent {
  id: StudentTimelineEventId
  studentId: StudentId
  category: TimelineCategory
  occurredAt: string
  /** Monotonic tiebreak for identical timestamps; part of the paging cursor. */
  sequence: number
  actor: ActorRef
  origin: TimelineOrigin
  subjectRef?: string
  summary: string
}

export interface StudentFinancialSummary {
  totalFees: Money
  paidAmount: Money
  remainingBalance: Money
  activeInstallments: number
  asOf: string
  sourceRevisionId?: string
}

export type FinanceUnavailableReason =
  | "finance-module-absent"
  | "source-error"
  | "timeout"

/**
 * Absence is never representable as zero: only the `available` variant carries
 * numbers (spec FR-027).
 */
export type StudentFinancialSummaryResult =
  | { state: "available"; summary: StudentFinancialSummary }
  | { state: "unavailable"; reason: FinanceUnavailableReason }
  | { state: "forbidden" }

export interface StudentIdentityRules {
  nationalIdPattern: string
  phonePattern: string
  minorAgeThreshold: number
  minimumGraduationAge: number
}

export interface StudentImagePolicy {
  allowedMimeTypes: string[]
  maxBytes: number
}

export interface StudentLookups {
  branches: LookupOption[]
  departments: LookupOption[]
  academicGrades: LookupOption[]
  qualifications: LookupOption[]
  customerServiceEmployees: LookupOption[]
  offerings: LookupOption[]
  batches: LookupOption[]
  statuses: { value: StudentStatus; label: string }[]
  documentTypes: StudentDocumentType[]
  identityRules: StudentIdentityRules
  imagePolicy: StudentImagePolicy
  currency: string
  precision: number
}
