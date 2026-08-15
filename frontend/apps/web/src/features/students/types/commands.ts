import type {
  StudentDocumentId,
  StudentDocumentTypeKey,
  StudentId,
  StudentNoteId,
  StudentStatus,
  TimelineCategory,
} from "./common"
import type { StudentAssignment, StudentIdentity } from "./domain"

export type StudentSortField =
  | "fullName"
  | "studentCode"
  | "enrollmentDate"
  | "updatedAt"
  | "status"

export interface StudentListQuery {
  search?: string
  branchIds?: string[]
  departmentIds?: string[]
  offeringIds?: string[]
  batchIds?: string[]
  statuses?: StudentStatus[]
  customerServiceEmployeeIds?: string[]
  sort?: { field: StudentSortField; direction: "asc" | "desc" }
  page: number
  pageSize: number
}

export interface StudentTimelineQuery {
  cursor?: string
  limit: number
  categories?: TimelineCategory[]
}

/** Maintainable profile input. Protected system facts are absent by construction. */
export interface StudentProfileInput {
  identity: StudentIdentity
  assignment: StudentAssignment
}

export interface UpdateProfileCommand {
  studentId: StudentId
  input: StudentProfileInput
  expectedVersion: number
}

export interface ChangeStatusCommand {
  studentId: StudentId
  toStatus: StudentStatus
  reason?: string
  expectedVersion: number
}

export interface BulkChangeStatusCommand {
  items: ChangeStatusCommand[]
}

export interface UploadDocumentCommand {
  studentId: StudentId
  typeKey: StudentDocumentTypeKey
  file: File
  /** Client-generated; a repeated attempt must not create a duplicate. */
  uploadAttemptId: string
  expectedVersion: number
}

export interface ReplaceDocumentCommand {
  studentId: StudentId
  documentId: StudentDocumentId
  file: File
  uploadAttemptId: string
  expectedVersion: number
}

export interface ArchiveDocumentCommand {
  studentId: StudentId
  documentId: StudentDocumentId
  reason?: string
  expectedVersion: number
}

export interface AddNoteCommand {
  studentId: StudentId
  content: string
}

export interface EditNoteCommand {
  studentId: StudentId
  noteId: StudentNoteId
  content: string
}

export interface ArchiveNoteCommand {
  studentId: StudentId
  noteId: StudentNoteId
}

export interface EnrollFromAdmissionCommand {
  admissionId: string
  expectedAdmissionVersion: number
}
