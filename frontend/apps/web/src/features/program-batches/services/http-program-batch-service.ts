import type { Paginated, ProgramBatchId, ProgramId } from "../types/common"
import type {
  BatchListQuery,
  CreateBatchCommand,
  TransitionBatchCommand,
  UpdateBatchCommand,
} from "../types/commands"
import type {
  BatchDetail,
  BatchLookups,
  BatchSummary,
  Eligibility,
  FinancialRevision,
  LifecycleEvent,
  Readiness,
} from "../types/domain"
import { ProgramBatchError } from "./program-batch-error"
import type { ProgramBatchService } from "./program-batch-service"
import {
  toBatchBody,
  toBatchDetail,
  toBatchSummary,
  toEligibility,
  toFinancialRevision,
  toLifecycleEvent,
  toLookups,
  toPaginated,
  toReadiness,
  type ApiBatch,
  type ApiLifecycleEvent,
  type ApiLookups,
} from "./program-batch-mapper"
import { ApiError, httpClient, type QueryValue } from "@/shared/api"

const programPath = (programId: string) => `/programs/${programId}/batches`
const batchPath = (programId: string, batchId: string) =>
  `${programPath(programId)}/${batchId}`

/**
 * Denomination used only when a batch has no financial revision at all.
 *
 * Every real figure arrives from the API already carrying its own currency and
 * precision, so this is never used to *reinterpret* an amount — only to render
 * a zero for a batch that has no revision yet, which creation does not produce.
 */
const FALLBACK = { currency: "EGP", precision: 2 }

/**
 * The evaluation date the consumer routes require.
 *
 * Eligibility and lifecycle are answered *as of* a date — a batch open for
 * registration today may not be tomorrow — and the API makes that explicit
 * rather than reading its own clock. The local date is the caller's "now".
 */
const today = () => new Date().toLocaleDateString("en-CA")

function toBatchError(error: unknown): ProgramBatchError {
  if (!(error instanceof ApiError))
    return new ProgramBatchError(
      "unexpected",
      "تعذر إكمال الطلب. حاول مرة أخرى.",
      "unexpected",
      undefined,
      true
    )

  const { code, status, message, fieldErrors } = error
  if (code === "VERSION_CONFLICT")
    return new ProgramBatchError("version-conflict", message, "conflict", fieldErrors)
  // A batch collision is always the code: `DUPLICATE_CODE` is what this module
  // raises, and it carries no details, so the field is named here or the form
  // marks nothing.
  if (code === "DUPLICATE_CODE" || code === "DUPLICATE_VALUE")
    return new ProgramBatchError("duplicate", message, "conflict", {
      code: message,
      ...fieldErrors,
    })
  if (code === "INVALID_TRANSITION" || code === "NOT_READY")
    return new ProgramBatchError(code, message, "conflict", fieldErrors)
  if (code === "VALIDATION_ERROR" || status === 422)
    return new ProgramBatchError("validation", message, "validation", fieldErrors)
  if (status === 404)
    return new ProgramBatchError("not-found", message, "not-found")
  if (status === 401 || status === 403)
    return new ProgramBatchError("forbidden", message, "forbidden")
  if (status === 409)
    return new ProgramBatchError(code, message, "conflict", fieldErrors)
  if (status === 0 || status >= 500)
    return new ProgramBatchError(code, message, "unavailable", fieldErrors, true)
  return new ProgramBatchError(code, message, "unexpected", fieldErrors)
}

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toBatchError(error)
  }
}

const listParams = (query: BatchListQuery): Record<string, QueryValue> => ({
  page: query.page,
  pageSize: query.pageSize,
  ...(query.search ? { search: query.search } : {}),
  ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
  ...(query.intakeId ? { intakeId: query.intakeId } : {}),
  ...(query.branchId ? { branchId: query.branchId } : {}),
  ...(query.status ? { status: query.status === "all" ? "ALL" : query.status } : {}),
  ...(query.sort ? { sortBy: query.sort } : {}),
  ...(query.direction ? { sortOrder: query.direction } : {}),
})

export const httpProgramBatchService: ProgramBatchService = {
  async list(
    programId: ProgramId,
    query: BatchListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<BatchSummary>> {
    return guard(async () => {
      const page = await httpClient.getPage<ApiBatch>(
        programPath(programId),
        listParams(query),
        signal
      )
      return toPaginated(page, (row) => toBatchSummary(row, FALLBACK))
    })
  },

  async get(
    programId: ProgramId,
    batchId: ProgramBatchId,
    signal?: AbortSignal
  ): Promise<BatchDetail> {
    return guard(async () =>
      toBatchDetail(
        await httpClient.get<ApiBatch>(
          batchPath(programId, batchId),
          undefined,
          signal
        ),
        FALLBACK
      )
    )
  },

  async lookups(programId: ProgramId): Promise<BatchLookups> {
    return guard(async () =>
      toLookups(
        await httpClient.get<ApiLookups>(`${programPath(programId)}/lookups`)
      )
    )
  },

  async create(command: CreateBatchCommand): Promise<BatchDetail> {
    return guard(async () =>
      toBatchDetail(
        await httpClient.post<ApiBatch>(
          programPath(command.programId),
          toBatchBody(command.input)
        ),
        FALLBACK
      )
    )
  },

  async update(command: UpdateBatchCommand): Promise<BatchDetail> {
    return guard(async () =>
      toBatchDetail(
        await httpClient.patch<ApiBatch>(
          batchPath(command.programId, command.batchId),
          { ...toBatchBody(command.input), expectedVersion: command.expectedVersion }
        ),
        FALLBACK
      )
    )
  },

  async transition(command: TransitionBatchCommand): Promise<BatchDetail> {
    return guard(async () =>
      toBatchDetail(
        await httpClient.patch<ApiBatch>(
          `${batchPath(command.programId, command.batchId)}/status`,
          {
            toStatus: command.toStatus,
            expectedVersion: command.expectedVersion,
            ...(command.reason ? { reason: command.reason } : {}),
          }
        ),
        FALLBACK
      )
    )
  },

  async readiness(
    programId: ProgramId,
    batchId: ProgramBatchId
  ): Promise<Readiness> {
    return guard(async () =>
      toReadiness(
        await httpClient.get<Parameters<typeof toReadiness>[0]>(
          `${batchPath(programId, batchId)}/readiness`
        )
      )
    )
  },

  async eligibility(
    batchId: ProgramBatchId,
    branchId: string,
    on?: string
  ): Promise<Eligibility> {
    return guard(async () =>
      toEligibility(
        await httpClient.get<Parameters<typeof toEligibility>[0]>(
          `/batches/${batchId}/eligibility`,
          { branchId, today: on ?? today() }
        )
      )
    )
  },

  async lifecycle(batchId: ProgramBatchId): Promise<LifecycleEvent[]> {
    return guard(async () => {
      const events = await httpClient.get<ApiLifecycleEvent[]>(
        `/batches/${batchId}/lifecycle`,
        { today: today() }
      )
      return (events ?? []).map(toLifecycleEvent)
    })
  },

  async revisions(batchId: ProgramBatchId): Promise<FinancialRevision[]> {
    return guard(async () => {
      const revisions = await httpClient.get<
        Array<Parameters<typeof toFinancialRevision>[0]>
      >(`/batches/${batchId}/financial-revisions`, { today: today() })
      return (revisions ?? []).map((revision) =>
        toFinancialRevision(revision, FALLBACK)
      )
    })
  },
}
