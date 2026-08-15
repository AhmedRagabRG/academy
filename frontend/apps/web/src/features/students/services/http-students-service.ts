import { httpClient, type QueryValue } from "@/shared/api"
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
  StudentProfileInput,
  StudentTimelineQuery,
  UpdateProfileCommand,
  UploadDocumentCommand,
} from "../types/commands"
import { fromApiError, guard, isAbort } from "./students-api-error"
import type { StudentsService } from "./students-service"
import {
  toContextSummary,
  toDocument,
  toDocumentVersion,
  toEnrollment,
  toLookups,
  toNote,
  toPaginated,
  toStatusChange,
  toStudentDetail,
  toStudentSummary,
  toTimelinePage,
  type ApiBulkStatusOutcome,
  type ApiStudentContextSummary,
  type ApiStudentDetail,
  type ApiStudentDocument,
  type ApiStudentDocumentVersion,
  type ApiStudentEnrollment,
  type ApiStudentListRow,
  type ApiStudentLookups,
  type ApiStudentNote,
  type ApiStudentStatusChange,
  type ApiStudentTimelinePage,
} from "./students-mapper"

const listParams = (query: StudentListQuery): Record<string, QueryValue> => ({
  page: query.page,
  pageSize: query.pageSize,
  ...(query.search ? { search: query.search } : {}),
  ...(query.branchIds?.length ? { branchIds: query.branchIds } : {}),
  ...(query.departmentIds?.length ? { departmentIds: query.departmentIds } : {}),
  ...(query.offeringIds?.length ? { offeringIds: query.offeringIds } : {}),
  ...(query.batchIds?.length ? { batchIds: query.batchIds } : {}),
  ...(query.statuses?.length ? { statuses: query.statuses } : {}),
  ...(query.customerServiceEmployeeIds?.length
    ? { customerServiceEmployeeIds: query.customerServiceEmployeeIds }
    : {}),
  ...(query.sort
    ? { sortBy: query.sort.field, sortOrder: query.sort.direction }
    : {}),
})

/**
 * The profile write body.
 *
 * The API validates with `forbidNonWhitelisted`, so this lists the accepted
 * properties explicitly rather than spreading the form model — one stray key
 * fails the whole request with a 422. Blank optionals are omitted for the same
 * reason: `""` counts as present and then trips the minimum-length rules.
 */
const toProfileBody = (input: StudentProfileInput) => ({
  identity: {
    fullName: input.identity.fullName,
    primaryPhone: input.identity.primaryPhone,
    ...(input.identity.guardianName
      ? { guardianName: input.identity.guardianName }
      : {}),
    ...(input.identity.guardianPhone
      ? { guardianPhone: input.identity.guardianPhone }
      : {}),
    ...(input.identity.nationalId
      ? { nationalId: input.identity.nationalId }
      : {}),
    ...(input.identity.alternativeIdentityReason
      ? { alternativeIdentityReason: input.identity.alternativeIdentityReason }
      : {}),
    address: input.identity.address,
    dateOfBirth: input.identity.dateOfBirth,
    qualificationId: input.identity.qualificationId,
    graduationYear: input.identity.graduationYear,
    ...(input.identity.profileImageUrl
      ? { profileImageUrl: input.identity.profileImageUrl }
      : {}),
  },
  assignment: {
    registrationBranchId: input.assignment.registrationBranchId,
    studyBranchId: input.assignment.studyBranchId,
    departmentId: input.assignment.departmentId,
    ...(input.assignment.academicGradeId
      ? { academicGradeId: input.assignment.academicGradeId }
      : {}),
    customerServiceEmployeeId: input.assignment.customerServiceEmployeeId,
  },
})

/** The multipart body both document write routes consume. */
function documentForm(
  command: UploadDocumentCommand | ReplaceDocumentCommand,
  typeKey?: string
): FormData {
  const form = new FormData()
  if (typeKey) form.append("typeKey", typeKey)
  form.append("uploadAttemptId", command.uploadAttemptId)
  form.append("expectedVersion", String(command.expectedVersion))
  form.append("file", command.file, command.file.name)
  return form
}

export const httpStudentsService: StudentsService = {
  async list(
    query: StudentListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<StudentSummary>> {
    return guard(async () =>
      toPaginated(
        await httpClient.getPage<ApiStudentListRow>(
          "/students",
          listParams(query),
          signal
        ),
        toStudentSummary
      )
    )
  },

  async get(studentId: StudentId, signal?: AbortSignal): Promise<StudentDetail> {
    return guard(async () =>
      toStudentDetail(
        await httpClient.get<ApiStudentDetail>(
          `/students/${studentId}`,
          undefined,
          signal
        )
      )
    )
  },

  async lookups(signal?: AbortSignal): Promise<StudentLookups> {
    return guard(async () =>
      toLookups(
        await httpClient.get<ApiStudentLookups>(
          "/students/lookups",
          undefined,
          signal
        )
      )
    )
  },

  async listEnrollments(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentEnrollment[]> {
    return guard(async () => {
      const rows = await httpClient.get<ApiStudentEnrollment[] | null>(
        `/students/${studentId}/enrollments`,
        undefined,
        signal
      )
      return (rows ?? []).map(toEnrollment)
    })
  },

  async listDocuments(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentDocument[]> {
    return guard(async () => {
      const rows = await httpClient.get<ApiStudentDocument[] | null>(
        `/students/${studentId}/documents`,
        undefined,
        signal
      )
      return (rows ?? []).map(toDocument)
    })
  },

  async documentHistory(
    studentId: StudentId,
    documentId: StudentDocumentId,
    signal?: AbortSignal
  ): Promise<StudentDocumentVersion[]> {
    return guard(async () => {
      const rows = await httpClient.get<ApiStudentDocumentVersion[] | null>(
        `/students/${studentId}/documents/${documentId}/versions`,
        undefined,
        signal
      )
      return (rows ?? []).map(toDocumentVersion)
    })
  },

  async listNotes(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentNote[]> {
    return guard(async () => {
      const rows = await httpClient.get<ApiStudentNote[] | null>(
        `/students/${studentId}/notes`,
        undefined,
        signal
      )
      return (rows ?? []).map(toNote)
    })
  },

  async listTimeline(
    studentId: StudentId,
    query: StudentTimelineQuery,
    signal?: AbortSignal
  ): Promise<Cursor<StudentTimelineEvent>> {
    return guard(async () =>
      toTimelinePage(
        await httpClient.get<ApiStudentTimelinePage>(
          `/students/${studentId}/timeline`,
          {
            limit: query.limit,
            ...(query.cursor ? { cursor: query.cursor } : {}),
            ...(query.categories?.length
              ? { categories: query.categories }
              : {}),
          },
          signal
        )
      )
    )
  },

  async listStatusHistory(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentStatusChange[]> {
    return guard(async () => {
      const rows = await httpClient.get<ApiStudentStatusChange[] | null>(
        `/students/${studentId}/status-history`,
        undefined,
        signal
      )
      return (rows ?? []).map(toStatusChange)
    })
  },

  /**
   * Always a 200 carrying the three-state union — `unavailable` is a documented
   * answer, not a failure, so it must not be thrown. A transport fault is the
   * one case that becomes a state here rather than an exception, because the
   * panel renders "unavailable" and the rest of the workspace keeps working.
   */
  async getFinancialSummary(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentFinancialSummaryResult> {
    try {
      return await httpClient.get<StudentFinancialSummaryResult>(
        `/students/${studentId}/financial-summary`,
        undefined,
        signal
      )
    } catch (error) {
      if (isAbort(error)) throw error
      const mapped = fromApiError(error)
      if (mapped.code === "forbidden") return { state: "forbidden" }
      if (mapped.code === "not-found") throw mapped
      return { state: "unavailable", reason: "source-error" }
    }
  },

  async getContextSummary(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentContextSummary> {
    return guard(async () =>
      toContextSummary(
        await httpClient.get<ApiStudentContextSummary>(
          `/students/${studentId}/context-summary`,
          undefined,
          signal
        )
      )
    )
  },

  /**
   * The CSV export.
   *
   * The route answers `text/csv`, but the API's global envelope interceptor
   * still wraps the body as `{success, data}` — so the raw response text is
   * JSON whose `data` holds the actual CSV. Unwrapping is conditional rather
   * than unconditional: the day the export is excluded from that interceptor,
   * the body becomes real CSV and this keeps working without another change.
   */
  async exportList(
    query: StudentListQuery,
    signal?: AbortSignal
  ): Promise<string> {
    return guard(async () => {
      const body = await httpClient.getText(
        "/students/export",
        listParams(query),
        signal
      )
      try {
        const envelope: unknown = JSON.parse(body)
        if (
          typeof envelope === "object" &&
          envelope !== null &&
          typeof (envelope as { data?: unknown }).data === "string"
        )
          return (envelope as { data: string }).data
      } catch {
        // Not JSON — the response is already the CSV payload.
      }
      return body
    })
  },

  async updateProfile(command: UpdateProfileCommand): Promise<StudentDetail> {
    return guard(async () =>
      toStudentDetail(
        await httpClient.patch<ApiStudentDetail>(
          `/students/${command.studentId}`,
          {
            input: toProfileBody(command.input),
            expectedVersion: command.expectedVersion,
          }
        )
      )
    )
  },

  async changeStatus(command: ChangeStatusCommand): Promise<StudentDetail> {
    return guard(async () =>
      toStudentDetail(
        await httpClient.patch<ApiStudentDetail>(
          `/students/${command.studentId}/status`,
          {
            toStatus: command.toStatus,
            ...(command.reason ? { reason: command.reason } : {}),
            expectedVersion: command.expectedVersion,
          }
        )
      )
    )
  },

  /**
   * Partial success is the expected outcome, so the whole call succeeds and each
   * refusal arrives as a row. Throwing on the first refusal would discard the
   * outcomes of every student the API did apply.
   */
  async bulkChangeStatus(
    command: BulkChangeStatusCommand
  ): Promise<BulkStatusOutcome[]> {
    return guard(async () => {
      const outcomes = await httpClient.post<ApiBulkStatusOutcome[] | null>(
        "/students/bulk-status",
        {
          items: command.items.map((item) => ({
            studentId: item.studentId,
            toStatus: item.toStatus,
            ...(item.reason ? { reason: item.reason } : {}),
            expectedVersion: item.expectedVersion,
          })),
        }
      )
      return (outcomes ?? []).map((outcome) => ({
        studentId: outcome.studentId as StudentId,
        studentCode: outcome.studentCode,
        outcome: outcome.outcome,
        ...(outcome.refusalCode ? { refusalCode: outcome.refusalCode } : {}),
        ...(outcome.message ? { message: outcome.message } : {}),
      }))
    })
  },

  async uploadDocument(
    command: UploadDocumentCommand
  ): Promise<StudentDocument> {
    return guard(async () =>
      toDocument(
        await httpClient.postForm<ApiStudentDocument>(
          `/students/${command.studentId}/documents`,
          documentForm(command, command.typeKey)
        )
      )
    )
  },

  async replaceDocument(
    command: ReplaceDocumentCommand
  ): Promise<StudentDocument> {
    return guard(async () =>
      toDocument(
        await httpClient.postForm<ApiStudentDocument>(
          `/students/${command.studentId}/documents/${command.documentId}/replace`,
          documentForm(command)
        )
      )
    )
  },

  async archiveDocument(
    command: ArchiveDocumentCommand
  ): Promise<StudentDocument> {
    return guard(async () =>
      toDocument(
        await httpClient.patch<ApiStudentDocument>(
          `/students/${command.studentId}/documents/${command.documentId}/archive`,
          {
            ...(command.reason ? { reason: command.reason } : {}),
            expectedVersion: command.expectedVersion,
          }
        )
      )
    )
  },

  async addNote(command: AddNoteCommand): Promise<StudentNote> {
    return guard(async () =>
      toNote(
        await httpClient.post<ApiStudentNote>(
          `/students/${command.studentId}/notes`,
          { content: command.content }
        )
      )
    )
  },

  async editNote(command: EditNoteCommand): Promise<StudentNote> {
    return guard(async () =>
      toNote(
        await httpClient.patch<ApiStudentNote>(
          `/students/${command.studentId}/notes/${command.noteId}`,
          { content: command.content }
        )
      )
    )
  },

  async archiveNote(command: ArchiveNoteCommand): Promise<StudentNote> {
    return guard(async () =>
      toNote(
        await httpClient.patch<ApiStudentNote>(
          `/students/${command.studentId}/notes/${command.noteId}/archive`
        )
      )
    )
  },
}
