import type { Page } from "@/shared/api"
import type {
  ActorRef,
  Cursor,
  LookupOption,
  Paginated,
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
  EnrollmentStatus,
  DocumentState,
  OfferingKind,
} from "../types/common"
import type {
  Student,
  StudentDocument,
  StudentDocumentType,
  StudentDocumentVersion,
  StudentEnrollment,
  StudentFinancialSummaryResult,
  StudentIdentityRules,
  StudentImagePolicy,
  StudentLookups,
  StudentNote,
  StudentStatusChange,
  StudentTimelineEvent,
} from "../types/domain"
import type {
  StudentAreaPermissions,
  StudentContextSummary,
  StudentDetail,
  StudentDocumentCompletion,
  StudentSummary,
} from "../types/projections"

/**
 * The wire shapes the API actually returns.
 *
 * They are declared separately from the domain types rather than reused because
 * the two differ in exactly the places that matter: the API spells "absent" as
 * `null`, while the domain spells it as an omitted optional property. Mapping
 * through these aliases is what keeps a `null` from reaching a component that
 * type-checks against `string | undefined`.
 */

type Nullable<T> = T | null

export interface ApiActorRef {
  id: string
  name: string
  active: boolean
}

export interface ApiStudentListRow {
  id: string
  studentCode: string
  fullName: string
  phoneHint: string
  registrationBranchLabel: string
  studyBranchLabel: string
  departmentLabel: string
  primaryOfferingLabel: Nullable<string>
  primaryBatchLabel: Nullable<string>
  customerServiceEmployeeName: string
  status: StudentStatus
  enrollmentCount: number
  updatedAt: string
  version: number
}

export interface ApiStudentIdentity {
  fullName: string
  primaryPhone: string
  guardianName?: string
  guardianPhone?: string
  nationalId?: string
  alternativeIdentityReason?: string
  address: string
  dateOfBirth: string
  qualificationId: string
  qualificationLabel: string
  graduationYear: number
  profileImageUrl?: string
}

export interface ApiStudentAssignment {
  registrationBranchId: string
  registrationBranchLabel: string
  studyBranchId: string
  studyBranchLabel: string
  departmentId: string
  departmentLabel: string
  academicGradeId?: Nullable<string>
  academicGradeLabel?: Nullable<string>
  customerServiceEmployeeId: string
  customerServiceEmployeeName: string
}

export interface ApiStudentSystem {
  admissionId: string
  admissionReference: string
  approvalSnapshotId: string
  admissionDate: string
  enrollmentDate: string
}

export interface ApiStudentEnrollment {
  id: string
  studentId: string
  offeringKind: OfferingKind
  offeringId: string
  offeringVersionAtEnrollment: number
  offeringLabel: string
  offeringCode: string
  batchId: Nullable<string>
  batchVersionAtEnrollment: Nullable<number>
  batchLabel: Nullable<string>
  batchCode: Nullable<string>
  registrationBranchLabel: string
  studyBranchLabel: string
  enrollmentDate: string
  status: EnrollmentStatus
  sourceAdmissionId: string
}

export interface ApiStudentStatusChange {
  id: string
  fromStatus: Nullable<StudentStatus>
  toStatus: StudentStatus
  reason?: string
  actor: ApiActorRef
  occurredAt: string
  sourceVersion: number
  resultVersion: number
}

export interface ApiStudentDocumentVersion {
  id: string
  versionNumber: number
  fileName: string
  mimeType: string
  size: number
  previewUrl?: string
  uploadedAt: string
  uploadedBy: ApiActorRef
  uploadAttemptId: string
}

export interface ApiStudentDocument {
  id: string
  studentId: string
  type: {
    key: string
    label: string
    required: boolean
    multiple: boolean
    allowedMimeTypes: string[]
    maxBytes: number
  }
  state: DocumentState
  currentVersionId: Nullable<string>
  archiveReason?: Nullable<string>
  versions: ApiStudentDocumentVersion[]
}

export interface ApiStudentNote {
  id: string
  studentId: string
  content: string
  author: ApiActorRef
  createdAt: string
  editedAt?: string
  editedBy?: ApiActorRef
  archivedAt?: string
}

export interface ApiStudentTimelineEvent {
  id: string
  studentId: string
  category: TimelineCategory
  occurredAt: string
  sequence: number
  actor: ApiActorRef
  origin: TimelineOrigin
  subjectRef?: string
  summary: string
}

export interface ApiStudentTimelinePage {
  items: ApiStudentTimelineEvent[]
  nextCursor: Nullable<string>
}

export interface ApiStudentDetail {
  id: string
  organizationId: string
  studentCode: string
  status: StudentStatus
  identity: ApiStudentIdentity
  assignment: ApiStudentAssignment
  system: ApiStudentSystem
  enrollments: ApiStudentEnrollment[]
  documentCompletion: StudentDocumentCompletion
  availableStatusActions: StudentStatus[]
  permissions: StudentAreaPermissions
  statusHistory: ApiStudentStatusChange[]
  archivedAt?: string
  archiveReason?: Nullable<string>
  version: number
  createdAt: string
  createdBy: ApiActorRef
  updatedAt: string
  updatedBy: ApiActorRef
}

export interface ApiStudentLookups {
  branches: LookupOption[]
  departments: LookupOption[]
  academicGrades: LookupOption[]
  qualifications: LookupOption[]
  customerServiceEmployees: LookupOption[]
  statuses: { value: StudentStatus; label: string }[]
  documentTypes: StudentDocumentType[]
  identityRules: StudentIdentityRules
  imagePolicy: StudentImagePolicy
  currency: string
  precision: number
}

export interface ApiStudentContextSummary {
  studentId: string
  studentCode: string
  fullName: string
  status: StudentStatus
  assignment: {
    registrationBranchId: string
    studyBranchId: string
    departmentId: string
    academicGradeId: Nullable<string>
  }
  enrollmentTargets: {
    kind: OfferingKind
    offeringId: string
    batchId: Nullable<string>
    status: string
  }[]
  documentCompletion: { requiredTypes: number; present: number; missing: number }
  financialSummaryRef?: {
    state: StudentFinancialSummaryResult["state"]
    asOf: Nullable<string>
  }
  admissionRef: { admissionId: string; approvalSnapshotId: string }
  updatedAt: string
  version: number
}

export interface ApiBulkStatusOutcome {
  studentId: string
  studentCode: string
  outcome: "applied" | "refused"
  refusalCode?: string
  message?: string
}

/** `null` and `""` both mean "not set" on the wire; the domain says `undefined`. */
const optional = (value: Nullable<string> | undefined): string | undefined =>
  value ?? undefined

const optionalNumber = (
  value: Nullable<number> | undefined
): number | undefined => value ?? undefined

export const toActor = (actor: ApiActorRef): ActorRef => ({
  id: actor.id,
  name: actor.name,
  active: actor.active,
})

/**
 * Turns the client's page envelope into the module's `Paginated` shape.
 *
 * The envelope names the page size `limit`; every screen in this module reads
 * `pageSize`, so the rename happens here once instead of at each call site.
 */
export function toPaginated<TApi, TDomain>(
  page: Page<TApi>,
  map: (row: TApi) => TDomain
): Paginated<TDomain> {
  return {
    items: page.items.map(map),
    total: page.meta.total,
    page: page.meta.page,
    pageSize: page.meta.limit,
    totalPages: page.meta.totalPages,
  }
}

/**
 * The list row.
 *
 * `primaryOfferingLabel` falls back to an em dash rather than an empty string:
 * a student whose only enrollment was archived still occupies a table cell, and
 * a blank one reads as a rendering fault.
 */
export function toStudentSummary(row: ApiStudentListRow): StudentSummary {
  return {
    id: row.id as StudentId,
    studentCode: row.studentCode,
    fullName: row.fullName,
    phoneHint: row.phoneHint,
    registrationBranchLabel: row.registrationBranchLabel,
    studyBranchLabel: row.studyBranchLabel,
    departmentLabel: row.departmentLabel,
    primaryOfferingLabel: row.primaryOfferingLabel ?? "—",
    ...(row.primaryBatchLabel ? { primaryBatchLabel: row.primaryBatchLabel } : {}),
    customerServiceEmployeeName: row.customerServiceEmployeeName,
    status: row.status,
    enrollmentCount: row.enrollmentCount,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

export function toEnrollment(row: ApiStudentEnrollment): StudentEnrollment {
  return {
    id: row.id as StudentEnrollmentId,
    studentId: row.studentId as StudentId,
    offeringKind: row.offeringKind,
    offeringId: row.offeringId,
    offeringVersionAtEnrollment: row.offeringVersionAtEnrollment,
    offeringLabel: row.offeringLabel,
    offeringCode: row.offeringCode,
    ...(row.batchId ? { batchId: row.batchId } : {}),
    ...(row.batchVersionAtEnrollment !== null
      ? { batchVersionAtEnrollment: row.batchVersionAtEnrollment }
      : {}),
    ...(row.batchLabel ? { batchLabel: row.batchLabel } : {}),
    ...(row.batchCode ? { batchCode: row.batchCode } : {}),
    registrationBranchLabel: row.registrationBranchLabel,
    studyBranchLabel: row.studyBranchLabel,
    enrollmentDate: row.enrollmentDate,
    status: row.status,
    sourceAdmissionId: row.sourceAdmissionId,
  }
}

export function toStatusChange(
  row: ApiStudentStatusChange
): StudentStatusChange {
  return {
    id: row.id as StudentStatusChangeId,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    ...(row.reason ? { reason: row.reason } : {}),
    actor: toActor(row.actor),
    occurredAt: row.occurredAt,
    sourceVersion: row.sourceVersion,
    resultVersion: row.resultVersion,
  }
}

export function toDocumentVersion(
  row: ApiStudentDocumentVersion
): StudentDocumentVersion {
  return {
    id: row.id as StudentDocumentVersionId,
    versionNumber: row.versionNumber,
    fileName: row.fileName,
    mimeType: row.mimeType,
    size: row.size,
    ...(row.previewUrl ? { previewUrl: row.previewUrl } : {}),
    uploadedAt: row.uploadedAt,
    uploadedBy: toActor(row.uploadedBy),
    uploadAttemptId: row.uploadAttemptId,
  }
}

export function toDocument(row: ApiStudentDocument): StudentDocument {
  return {
    id: row.id as StudentDocumentId,
    studentId: row.studentId as StudentId,
    type: {
      ...row.type,
      key: row.type.key as StudentDocumentTypeKey,
    },
    state: row.state,
    ...(row.currentVersionId
      ? { currentVersionId: row.currentVersionId as StudentDocumentVersionId }
      : {}),
    ...(row.archiveReason ? { archiveReason: row.archiveReason } : {}),
    versions: (row.versions ?? []).map(toDocumentVersion),
  }
}

export function toNote(row: ApiStudentNote): StudentNote {
  return {
    id: row.id as StudentNoteId,
    studentId: row.studentId as StudentId,
    content: row.content,
    author: toActor(row.author),
    createdAt: row.createdAt,
    ...(row.editedAt ? { editedAt: row.editedAt } : {}),
    ...(row.editedBy ? { editedBy: toActor(row.editedBy) } : {}),
    ...(row.archivedAt ? { archivedAt: row.archivedAt } : {}),
  }
}

export function toTimelineEvent(
  row: ApiStudentTimelineEvent
): StudentTimelineEvent {
  return {
    id: row.id as StudentTimelineEventId,
    studentId: row.studentId as StudentId,
    category: row.category,
    occurredAt: row.occurredAt,
    sequence: row.sequence,
    actor: toActor(row.actor),
    origin: row.origin,
    ...(row.subjectRef ? { subjectRef: row.subjectRef } : {}),
    summary: row.summary,
  }
}

export function toTimelinePage(
  page: ApiStudentTimelinePage
): Cursor<StudentTimelineEvent> {
  return {
    items: (page.items ?? []).map(toTimelineEvent),
    // The route sends `null` for "no further page"; the domain cursor treats
    // the key's absence as the end, and `nextCursor: null` would not satisfy it.
    ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
  }
}

function toStudent(row: ApiStudentDetail): Student {
  return {
    id: row.id as StudentId,
    organizationId: row.organizationId,
    studentCode: row.studentCode,
    status: row.status,
    identity: {
      fullName: row.identity.fullName,
      primaryPhone: row.identity.primaryPhone,
      ...(row.identity.guardianName
        ? { guardianName: row.identity.guardianName }
        : {}),
      ...(row.identity.guardianPhone
        ? { guardianPhone: row.identity.guardianPhone }
        : {}),
      ...(row.identity.nationalId
        ? { nationalId: row.identity.nationalId }
        : {}),
      ...(row.identity.alternativeIdentityReason
        ? { alternativeIdentityReason: row.identity.alternativeIdentityReason }
        : {}),
      address: row.identity.address,
      dateOfBirth: row.identity.dateOfBirth,
      qualificationId: row.identity.qualificationId,
      qualificationLabel: row.identity.qualificationLabel,
      graduationYear: row.identity.graduationYear,
      ...(row.identity.profileImageUrl
        ? { profileImageUrl: row.identity.profileImageUrl }
        : {}),
    },
    assignment: {
      registrationBranchId: row.assignment.registrationBranchId,
      registrationBranchLabel: row.assignment.registrationBranchLabel,
      studyBranchId: row.assignment.studyBranchId,
      studyBranchLabel: row.assignment.studyBranchLabel,
      departmentId: row.assignment.departmentId,
      departmentLabel: row.assignment.departmentLabel,
      ...(row.assignment.academicGradeId
        ? { academicGradeId: row.assignment.academicGradeId }
        : {}),
      ...(row.assignment.academicGradeLabel
        ? { academicGradeLabel: row.assignment.academicGradeLabel }
        : {}),
      customerServiceEmployeeId: row.assignment.customerServiceEmployeeId,
      customerServiceEmployeeName: row.assignment.customerServiceEmployeeName,
    },
    system: { ...row.system },
    statusHistory: (row.statusHistory ?? []).map(toStatusChange),
    ...(row.archivedAt ? { archivedAt: row.archivedAt } : {}),
    ...(row.archiveReason ? { archiveReason: row.archiveReason } : {}),
    version: row.version,
    createdAt: row.createdAt,
    createdBy: toActor(row.createdBy),
    updatedAt: row.updatedAt,
    updatedBy: toActor(row.updatedBy),
  }
}

export function toStudentDetail(row: ApiStudentDetail): StudentDetail {
  return {
    ...toStudent(row),
    enrollments: (row.enrollments ?? []).map(toEnrollment),
    documentCompletion: row.documentCompletion,
    availableStatusActions: row.availableStatusActions ?? [],
    permissions: row.permissions,
  }
}

/**
 * The lookup payload.
 *
 * `offerings` and `batches` are not part of this route — the catalog owns them,
 * and the students API deliberately publishes only what it governs. They are
 * filled with empty lists so the two filters render as "no options" rather than
 * crashing the toolbar on an undefined array.
 */
export function toLookups(row: ApiStudentLookups): StudentLookups {
  return {
    branches: row.branches ?? [],
    departments: row.departments ?? [],
    academicGrades: row.academicGrades ?? [],
    qualifications: row.qualifications ?? [],
    customerServiceEmployees: row.customerServiceEmployees ?? [],
    offerings: [],
    batches: [],
    statuses: row.statuses ?? [],
    documentTypes: row.documentTypes ?? [],
    identityRules: row.identityRules,
    imagePolicy: row.imagePolicy,
    currency: row.currency,
    precision: row.precision,
  }
}

export function toContextSummary(
  row: ApiStudentContextSummary
): StudentContextSummary {
  return {
    studentId: row.studentId as StudentId,
    studentCode: row.studentCode,
    fullName: row.fullName,
    status: row.status,
    assignment: {
      registrationBranchId: row.assignment.registrationBranchId,
      studyBranchId: row.assignment.studyBranchId,
      departmentId: row.assignment.departmentId,
      ...(row.assignment.academicGradeId
        ? { academicGradeId: row.assignment.academicGradeId }
        : {}),
    },
    enrollmentTargets: (row.enrollmentTargets ?? []).map((target) => ({
      kind: target.kind,
      offeringId: target.offeringId,
      ...(target.batchId ? { batchId: target.batchId } : {}),
      status: target.status,
    })),
    documentCompletion: row.documentCompletion,
    ...(row.financialSummaryRef
      ? {
          financialSummaryRef: {
            state: row.financialSummaryRef.state,
            ...(optional(row.financialSummaryRef.asOf)
              ? { asOf: row.financialSummaryRef.asOf as string }
              : {}),
          },
        }
      : {}),
    admissionRef: row.admissionRef,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

export { optional, optionalNumber }
