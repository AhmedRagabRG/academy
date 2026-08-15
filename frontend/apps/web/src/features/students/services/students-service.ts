import type {
  Cursor,
  Paginated,
  StudentDocumentId,
  StudentId,
} from "../types/common"
import type {
  StudentDocument,
  StudentDocumentVersion,
  StudentEnrollment,
  StudentFinancialSummaryResult,
  StudentLookups,
  StudentNote,
  StudentStatusChange,
  StudentTimelineEvent,
} from "../types/domain"
import type {
  BulkStatusOutcome,
  StudentContextSummary,
  StudentDetail,
  StudentSummary,
} from "../types/projections"
import type {
  AddNoteCommand,
  ArchiveDocumentCommand,
  ArchiveNoteCommand,
  BulkChangeStatusCommand,
  ChangeStatusCommand,
  EditNoteCommand,
  ReplaceDocumentCommand,
  StudentListQuery,
  StudentTimelineQuery,
  UpdateProfileCommand,
  UploadDocumentCommand,
} from "../types/commands"

/**
 * The Students service facade.
 *
 * Note what is deliberately absent and must stay absent: there is no `create`,
 * no `delete`, no enrollment command, and no financial action. Students are
 * produced only through `studentIntakePort`, and financial operations belong to
 * the future Student Finance module (spec FR-001, FR-014, FR-026).
 */
export interface StudentsService {
  // Reads
  list(
    query: StudentListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<StudentSummary>>
  get(studentId: StudentId, signal?: AbortSignal): Promise<StudentDetail>
  lookups(signal?: AbortSignal): Promise<StudentLookups>
  listEnrollments(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentEnrollment[]>
  listDocuments(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentDocument[]>
  documentHistory(
    studentId: StudentId,
    documentId: StudentDocumentId,
    signal?: AbortSignal
  ): Promise<StudentDocumentVersion[]>
  listNotes(studentId: StudentId, signal?: AbortSignal): Promise<StudentNote[]>
  listTimeline(
    studentId: StudentId,
    query: StudentTimelineQuery,
    signal?: AbortSignal
  ): Promise<Cursor<StudentTimelineEvent>>
  listStatusHistory(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentStatusChange[]>
  getFinancialSummary(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentFinancialSummaryResult>
  getContextSummary(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentContextSummary>
  exportList(query: StudentListQuery, signal?: AbortSignal): Promise<string>

  // Commands
  updateProfile(command: UpdateProfileCommand): Promise<StudentDetail>
  changeStatus(command: ChangeStatusCommand): Promise<StudentDetail>
  bulkChangeStatus(
    command: BulkChangeStatusCommand
  ): Promise<BulkStatusOutcome[]>
  uploadDocument(command: UploadDocumentCommand): Promise<StudentDocument>
  replaceDocument(command: ReplaceDocumentCommand): Promise<StudentDocument>
  archiveDocument(command: ArchiveDocumentCommand): Promise<StudentDocument>
  addNote(command: AddNoteCommand): Promise<StudentNote>
  editNote(command: EditNoteCommand): Promise<StudentNote>
  archiveNote(command: ArchiveNoteCommand): Promise<StudentNote>
}
