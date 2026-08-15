import type {
  AdmissionDocumentId,
  AdmissionId,
  ApplicantId,
  Paginated,
} from "../types/common"
import type {
  AdmissionDetail,
  AdmissionDocument,
  AdmissionLifecycleEvent,
  AdmissionLookups,
  AdmissionReadiness,
  AdmissionSummary,
  Applicant,
  DocumentVersion,
  EnrollmentReadinessSummary,
  FinancialPreparationRevision,
} from "../types/domain"
import type {
  AdmissionListQuery,
  ArchiveApplicantCommand,
  BulkTransitionCommand,
  BulkTransitionOutcome,
  ChangeSelectionCommand,
  CreateDraftCommand,
  DraftAdmissionInput,
  PrepareFinancialsCommand,
  ReplaceDocumentCommand,
  TransitionAdmissionCommand,
  UpdateDraftCommand,
  UploadDocumentCommand,
  VerifyDocumentCommand,
  WithdrawDocumentCommand,
} from "../types/commands"
import { AdmissionsError } from "./admissions-error"
import type { AdmissionsService } from "./admissions-service"
import {
  availableActions,
  toAdmissionDetail,
  toAdmissionStatus,
  toAdmissionSummary,
  toApplicant,
  toDocument,
  toEnrollmentReadiness,
  toFinancialRevision,
  toLifecycleEvent,
  toLookups,
  toPaginated,
  toReadiness,
  type ApiAdmissionDetail,
  type ApiAdmissionListItem,
  type ApiAdmissionLookups,
  type ApiDocument,
  type ApiFinancialRevision,
  type ApiLifecycleEvent,
} from "./admissions-mapper"
import { ApiError, httpClient, type QueryValue } from "@/shared/api"

const FALLBACK = { currency: "EGP", precision: 2 }

function toAdmissionsError(error: unknown): AdmissionsError {
  if (!(error instanceof ApiError))
    return new AdmissionsError(
      "unexpected",
      "unexpected",
      "حدث خطأ غير متوقع. حاول مرة أخرى.",
      true
    )

  const { code, status, message, fieldErrors, currentVersion } = error
  if (code === "VERSION_CONFLICT")
    return new AdmissionsError(
      "version-conflict",
      "conflict",
      message,
      false,
      fieldErrors,
      currentVersion
    )
  if (code === "FILE_TOO_LARGE" || code === "UNSUPPORTED_FILE_TYPE" || code === "file-unreadable")
    return new AdmissionsError(code, "upload", message, false, fieldErrors)
  if (code === "VALIDATION_ERROR" || status === 422)
    return new AdmissionsError("validation", "validation", message, false, fieldErrors)
  if (status === 404) return new AdmissionsError("not-found", "not-found", message)
  if (status === 401 || status === 403)
    return new AdmissionsError("forbidden", "permission", message)
  if (code === "ENTITY_IN_USE" || code === "DEPENDENCY_IN_USE" || code === "DEPENDENCY_NOT_FOUND")
    return new AdmissionsError(code, "dependency", message, false, fieldErrors)
  if (status === 409)
    return new AdmissionsError(code, "conflict", message, false, fieldErrors)
  if (status === 0 || status >= 500)
    return new AdmissionsError(code, "unavailable", message, true, fieldErrors)
  return new AdmissionsError(code, "unexpected", message, false, fieldErrors)
}

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toAdmissionsError(error)
  }
}

/**
 * Query parameters for the admissions list.
 *
 * There is no "all" status on this route — an unfiltered read omits the
 * parameter, and sending `ALL` is a validation error, exactly as on the
 * employees route.
 */
const listParams = (query: AdmissionListQuery): Record<string, QueryValue> => ({
  page: query.page,
  pageSize: query.pageSize,
  ...(query.search ? { search: query.search } : {}),
  ...(query.branchId ? { branchId: query.branchId } : {}),
  ...(query.offeringId ? { offeringId: query.offeringId } : {}),
  ...(query.batchId ? { batchId: query.batchId } : {}),
  ...(query.admissionsEmployeeId
    ? { admissionsEmployeeId: query.admissionsEmployeeId }
    : {}),
  ...(query.customerServiceEmployeeId
    ? { customerServiceEmployeeId: query.customerServiceEmployeeId }
    : {}),
  ...(query.customerServiceManagerId
    ? { customerServiceManagerId: query.customerServiceManagerId }
    : {}),
  ...(query.status && query.status !== "all" ? { status: query.status } : {}),
  ...(query.sort ? { sortBy: query.sort } : {}),
  ...(query.direction ? { sortOrder: query.direction } : {}),
})

/**
 * The applicant body every route that validates one expects.
 *
 * Create, update and the duplicate check all take the same `ApplicantInputDto`,
 * so they share this — a second hand-rolled copy is how the duplicate check
 * came to omit `alternativeIdentityReason` and reject every applicant without
 * a national id.
 */
const toApplicantBody = (applicant: DraftAdmissionInput["applicant"]) => ({
  fullName: applicant.fullName,
  primaryPhone: applicant.primaryPhone,
  ...(applicant.guardianPhone ? { guardianPhone: applicant.guardianPhone } : {}),
  ...(applicant.nationalId
    ? { nationalId: applicant.nationalId }
    : {
        alternativeIdentityReason:
          applicant.alternativeIdentityReason?.trim() || "لا يوجد رقم قومي",
      }),
  address: applicant.address,
  dateOfBirth: applicant.dateOfBirth,
  qualificationId: applicant.qualificationId,
  graduationYear: applicant.graduationYear,
  ...(applicant.notes ? { notes: applicant.notes } : {}),
})

/** The write body both create and update send. */
const toInputBody = (input: DraftAdmissionInput) => ({
  applicant: toApplicantBody(input.applicant),
  assignment: {
    registrationBranchId: input.assignment.registrationBranchId,
    studyBranchId: input.assignment.studyBranchId,
    admissionsEmployeeId: input.assignment.admissionsEmployeeId,
    customerServiceEmployeeId: input.assignment.customerServiceEmployeeId,
    customerServiceManagerId: input.assignment.customerServiceManagerId,
    departmentId: input.assignment.departmentId,
    leadSourceId: input.assignment.leadSourceId,
    ...(input.assignment.academicGradeId
      ? { academicGradeId: input.assignment.academicGradeId }
      : {}),
  },
  selection: {
    offeringKind: input.selection?.offeringKind ?? "professional-program",
    offeringId: input.selection?.offeringId ?? "",
    ...(input.selection?.batchId ? { batchId: input.selection.batchId } : {}),
  },
  financial: {
    discountMode: input.financial?.discountMode ?? "none",
    discountValue: input.financial?.discountValue ?? "0",
    ...(input.financial?.reason ? { reason: input.financial.reason } : {}),
  },
  ...(input.notes ? { notes: input.notes } : {}),
})

/** Reads the pieces the detail view needs but the record route does not carry. */
async function detailParts(
  id: string,
  status: ReturnType<typeof toAdmissionStatus>,
  version: number,
  signal?: AbortSignal
) {
  const action = status === "under-review" ? "approve" : "submit"
  const [documents, readinessRow, lifecycle, financialHistory] = await Promise.all([
    httpClient
      .get<ApiDocument[] | null>(`/admissions/${id}/documents`, undefined, signal)
      .catch(() => null),
    httpClient
      .get<Parameters<typeof toReadiness>[0]>(
        `/admissions/${id}/readiness`,
        { action },
        signal
      )
      .catch(() => ({ ready: false, findings: [] })),
    httpClient
      .get<ApiLifecycleEvent[] | null>(`/admissions/${id}/lifecycle`, undefined, signal)
      .catch(() => null),
    httpClient
      .get<ApiFinancialRevision[] | null>(
        `/admissions/${id}/financial-history`,
        undefined,
        signal
      )
      .catch(() => null),
  ])

  const mappedDocuments = (documents ?? []).map(toDocument)
  return {
    documents: mappedDocuments,
    readiness: toReadiness(readinessRow, { action, status, version }, mappedDocuments),
    lifecycle: (lifecycle ?? []).map(toLifecycleEvent),
    financialHistory: (financialHistory ?? []).map((revision) =>
      toFinancialRevision(revision, FALLBACK)
    ),
    defaults: FALLBACK,
  }
}

async function readDetail(id: string, signal?: AbortSignal): Promise<AdmissionDetail> {
  const row = await httpClient.get<ApiAdmissionDetail>(
    `/admissions/${id}`,
    undefined,
    signal
  )
  const parts = await detailParts(
    id,
    toAdmissionStatus(row.status),
    row.version,
    signal
  )
  return toAdmissionDetail(row, parts)
}

/** Builds the multipart body the document routes consume. */
function documentForm(command: UploadDocumentCommand, withRequirement: boolean) {
  const form = new FormData()
  if (withRequirement) form.append("requirementId", command.requirementId)
  form.append("idempotencyKey", command.idempotencyKey)
  form.append("expectedVersion", String(command.expectedVersion))
  // The API stores the uploaded bytes, so the actual file has to travel; the
  // metadata the UI keeps for preview is not a substitute.
  if (command.file.blob)
    form.append("file", command.file.blob, command.file.name)
  return form
}

function assertFile(command: UploadDocumentCommand) {
  if (!command.file.blob)
    throw new AdmissionsError(
      "file-missing",
      "upload",
      "تعذر رفع الملف. أعد اختيار الملف وحاول مجددًا."
    )
}

export const httpAdmissionsService: AdmissionsService = {
  async list(
    query: AdmissionListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<AdmissionSummary>> {
    return guard(async () =>
      toPaginated(
        await httpClient.getPage<ApiAdmissionListItem>(
          "/admissions",
          listParams(query),
          signal
        ),
        toAdmissionSummary
      )
    )
  },

  async exportList(query: AdmissionListQuery, signal?: AbortSignal): Promise<string> {
    return guard(async () =>
      httpClient.getText("/admissions/export", listParams(query), signal)
    )
  },

  async bulkTransition(
    command: BulkTransitionCommand
  ): Promise<BulkTransitionOutcome[]> {
    return guard(async () => {
      const results = await httpClient.post<
        Array<{
          admissionId: string
          success: boolean
          error?: { message?: string } | string | null
        }>
      >("/admissions/bulk-status", {
        items: command.items.map((item) => ({
          admissionId: item.admissionId,
          toStatus: item.toStatus,
          expectedVersion: item.expectedVersion,
          ...(item.reason ? { reason: item.reason } : {}),
        })),
      })
      return (results ?? []).map((result) => ({
        admissionId: result.admissionId as AdmissionId,
        success: result.success,
        message:
          typeof result.error === "string"
            ? result.error
            : (result.error?.message ?? undefined),
      }))
    })
  },

  async get(id: AdmissionId, signal?: AbortSignal): Promise<AdmissionDetail> {
    return guard(async () => readDetail(id, signal))
  },

  async lookups(signal?: AbortSignal): Promise<AdmissionLookups> {
    return guard(async () =>
      toLookups(
        await httpClient.get<ApiAdmissionLookups>(
          "/admissions/lookups",
          undefined,
          signal
        )
      )
    )
  },

  async findDuplicates(
    applicant: CreateDraftCommand["input"]["applicant"],
    signal?: AbortSignal
  ) {
    return guard(async () => {
      const matches = await httpClient.post<
        Array<{ applicantId: string; label: string; reasons: string[] }>
      >("/admissions/duplicates", toApplicantBody(applicant))
      void signal
      return (matches ?? []).map((match) => ({
        applicantId: match.applicantId as ApplicantId,
        label: match.label,
        reasons: match.reasons ?? [],
      }))
    })
  },

  async create(command: CreateDraftCommand): Promise<AdmissionDetail> {
    return guard(async () => {
      const created = await httpClient.post<ApiAdmissionDetail>("/admissions", {
        input: toInputBody(command.input),
        ...(command.duplicateResolution
          ? {
              duplicateResolution: {
                outcome: command.duplicateResolution.outcome,
                ...(command.duplicateResolution.applicantId
                  ? { applicantId: command.duplicateResolution.applicantId }
                  : {}),
                ...(command.duplicateResolution.reason
                  ? { reason: command.duplicateResolution.reason }
                  : {}),
              },
            }
          : {}),
      })
      return readDetail(created.id)
    })
  },

  async update(command: UpdateDraftCommand): Promise<AdmissionDetail> {
    return guard(async () => {
      // The route *does* carry a version check: it compare-and-swaps on
      // `expectedVersion` and rejects the body outright without one. Omitting
      // it made every draft edit fail validation before reaching the service.
      await httpClient.patch<ApiAdmissionDetail>(
        `/admissions/${command.admissionId}`,
        {
          input: toInputBody(command.input),
          expectedVersion: command.expectedVersion,
        }
      )
      return readDetail(command.admissionId)
    })
  },

  async archiveApplicant(command: ArchiveApplicantCommand): Promise<Applicant> {
    return guard(async () =>
      toApplicant(
        await httpClient.patch(`/applicants/${command.applicantId}/archive`, {
          reason: command.reason,
          expectedVersion: command.expectedVersion,
        })
      )
    )
  },

  async changeSelection(command: ChangeSelectionCommand): Promise<AdmissionDetail> {
    return guard(async () => {
      await httpClient.patch(`/admissions/${command.admissionId}/selection`, {
        selection: {
          offeringKind: command.selection.offeringKind,
          offeringId: command.selection.offeringId,
          ...(command.selection.batchId ? { batchId: command.selection.batchId } : {}),
        },
        confirmedConsequences: command.confirmedConsequences,
        reason: command.reason ?? "تغيير الاختيار الأكاديمي",
        expectedVersion: command.expectedVersion,
      })
      return readDetail(command.admissionId)
    })
  },

  async prepareFinancials(
    command: PrepareFinancialsCommand
  ): Promise<AdmissionDetail> {
    return guard(async () => {
      await httpClient.patch(`/admissions/${command.admissionId}/financials`, {
        input: {
          discountMode: command.input.discountMode,
          discountValue: command.input.discountValue,
          ...(command.input.reason ? { reason: command.input.reason } : {}),
        },
        expectedVersion: command.expectedVersion,
      })
      return readDetail(command.admissionId)
    })
  },

  async documents(
    id: AdmissionId,
    signal?: AbortSignal
  ): Promise<AdmissionDocument[]> {
    return guard(async () => {
      const documents = await httpClient.get<ApiDocument[] | null>(
        `/admissions/${id}/documents`,
        undefined,
        signal
      )
      return (documents ?? []).map(toDocument)
    })
  },

  async refreshDocumentPolicy(id: AdmissionId): Promise<AdmissionDocument[]> {
    return guard(async () => {
      const detail = await httpClient.get<ApiAdmissionDetail>(`/admissions/${id}`)
      await httpClient.post(`/admissions/${id}/documents/refresh-policy`, {
        expectedVersion: detail.version,
      })
      const documents = await httpClient.get<ApiDocument[] | null>(
        `/admissions/${id}/documents`
      )
      return (documents ?? []).map(toDocument)
    })
  },

  async uploadDocument(command: UploadDocumentCommand): Promise<AdmissionDocument> {
    return guard(async () => {
      assertFile(command)
      return toDocument(
        await httpClient.postForm<ApiDocument>(
          `/admissions/${command.admissionId}/documents`,
          documentForm(command, true)
        )
      )
    })
  },

  async replaceDocument(command: ReplaceDocumentCommand): Promise<AdmissionDocument> {
    return guard(async () => {
      assertFile(command)
      return toDocument(
        await httpClient.postForm<ApiDocument>(
          `/admissions/${command.admissionId}/documents/${command.documentId}/replace`,
          documentForm(command, false)
        )
      )
    })
  },

  async withdrawDocument(
    command: WithdrawDocumentCommand
  ): Promise<AdmissionDocument> {
    return guard(async () =>
      toDocument(
        await httpClient.post<ApiDocument>(
          `/admissions/${command.admissionId}/documents/${command.documentId}/withdraw`,
          {
            documentVersionId: command.versionId,
            ...(command.reason ? { reason: command.reason } : {}),
            expectedVersion: command.expectedVersion,
          }
        )
      )
    )
  },

  async verifyDocument(command: VerifyDocumentCommand): Promise<AdmissionDocument> {
    return guard(async () =>
      toDocument(
        await httpClient.post<ApiDocument>(
          `/admissions/${command.admissionId}/documents/${command.documentId}/verify`,
          {
            documentId: command.documentId,
            versionId: command.versionId,
            decision: command.decision,
            ...(command.reason ? { reason: command.reason } : {}),
            expectedVersion: command.expectedVersion,
          }
        )
      )
    )
  },

  async documentHistory(
    admissionId: AdmissionId,
    documentId: AdmissionDocumentId,
    signal?: AbortSignal
  ): Promise<DocumentVersion[]> {
    return guard(async () => {
      const document = await httpClient.get<ApiDocument | null>(
        `/admissions/${admissionId}/documents/${documentId}/versions`,
        undefined,
        signal
      )
      return document ? toDocument(document).versions : []
    })
  },

  async transition(command: TransitionAdmissionCommand): Promise<AdmissionDetail> {
    return guard(async () => {
      await httpClient.patch(`/admissions/${command.admissionId}/status`, {
        toStatus: command.toStatus,
        ...(command.reason ? { reason: command.reason } : {}),
        expectedVersion: command.expectedVersion,
      })
      return readDetail(command.admissionId)
    })
  },

  async readiness(
    id: AdmissionId,
    action: "submit" | "approve",
    signal?: AbortSignal
  ): Promise<AdmissionReadiness> {
    return guard(async () => {
      const [row, detail, documents] = await Promise.all([
        httpClient.get<Parameters<typeof toReadiness>[0]>(
          `/admissions/${id}/readiness`,
          { action },
          signal
        ),
        httpClient.get<ApiAdmissionDetail>(`/admissions/${id}`, undefined, signal),
        httpClient
          .get<ApiDocument[] | null>(`/admissions/${id}/documents`, undefined, signal)
          .catch(() => null),
      ])
      return toReadiness(
        row,
        {
          action,
          status: toAdmissionStatus(detail.status),
          version: detail.version,
        },
        (documents ?? []).map(toDocument)
      )
    })
  },

  async lifecycle(
    id: AdmissionId,
    signal?: AbortSignal
  ): Promise<AdmissionLifecycleEvent[]> {
    return guard(async () => {
      const events = await httpClient.get<ApiLifecycleEvent[] | null>(
        `/admissions/${id}/lifecycle`,
        undefined,
        signal
      )
      return (events ?? []).map(toLifecycleEvent)
    })
  },

  async financialHistory(
    id: AdmissionId,
    signal?: AbortSignal
  ): Promise<FinancialPreparationRevision[]> {
    return guard(async () => {
      const revisions = await httpClient.get<ApiFinancialRevision[] | null>(
        `/admissions/${id}/financial-history`,
        undefined,
        signal
      )
      return (revisions ?? []).map((revision) =>
        toFinancialRevision(revision, FALLBACK)
      )
    })
  },

  async enrollmentReadiness(
    id: AdmissionId,
    signal?: AbortSignal
  ): Promise<EnrollmentReadinessSummary> {
    return guard(async () => {
      const [row, detail] = await Promise.all([
        httpClient.get<Parameters<typeof toEnrollmentReadiness>[0]>(
          `/admissions/${id}/enrollment-readiness`,
          undefined,
          signal
        ),
        httpClient.get<ApiAdmissionDetail>(`/admissions/${id}`, undefined, signal),
      ])
      return toEnrollmentReadiness(row, {
        id,
        reference: detail.reference,
        status: toAdmissionStatus(detail.status),
        version: detail.version,
      })
    })
  },
}
