import { ApiError, httpClient } from "@/shared/api"
import { PipelineAdminError } from "./pipeline-admin-error"
import type {
  PipelineAdminService,
  PipelinePatch,
  StagePatch,
} from "./pipeline-admin-service"
import type {
  PipelineDraft,
  PipelineRecord,
  StageDraft,
  StageOrderItem,
} from "../types/domain"

function toPipelineAdminError(error: unknown): PipelineAdminError {
  if (!(error instanceof ApiError))
    return new PipelineAdminError(
      "UNEXPECTED",
      "تعذر إكمال الطلب. حاول مرة أخرى."
    )
  const code =
    error.code === "VERSION_CONFLICT"
      ? "CONFLICT"
      : error.code === "DEPENDENCY_IN_USE"
        ? "DEPENDENCY_IN_USE"
        : error.status === 404
          ? "NOT_FOUND"
          : error.status === 401 || error.status === 403
            ? "FORBIDDEN"
            : error.status === 422
              ? "VALIDATION"
              : error.status === 409
                ? "CONFLICT"
                : error.status === 0 || error.status >= 500
                  ? "UNAVAILABLE"
                  : "UNEXPECTED"
  return new PipelineAdminError(
    code,
    error.message,
    error.fieldErrors,
    error.currentVersion,
    error.status === 0 || error.status >= 500
  )
}

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error
    throw toPipelineAdminError(error)
  }
}

export const httpPipelineAdminService: PipelineAdminService = {
  list(signal) {
    return guard(() =>
      httpClient.get<PipelineRecord[]>("/pipelines", undefined, signal)
    )
  },

  detail(id, signal) {
    return guard(() =>
      httpClient.get<PipelineRecord>(`/pipelines/${id}`, undefined, signal)
    )
  },

  create(draft: PipelineDraft) {
    return guard(() => httpClient.post<PipelineRecord>("/pipelines", draft))
  },

  update(id, patch: PipelinePatch) {
    return guard(() =>
      httpClient.patch<PipelineRecord>(`/pipelines/${id}`, patch)
    )
  },

  archive(id, expectedVersion) {
    return guard(() =>
      httpClient.post<PipelineRecord>(`/pipelines/${id}/archive`, {
        expectedVersion,
      })
    )
  },

  restore(id, expectedVersion) {
    return guard(() =>
      httpClient.post<PipelineRecord>(`/pipelines/${id}/restore`, {
        expectedVersion,
      })
    )
  },

  async remove(id, expectedVersion) {
    await guard(() =>
      httpClient.delete<void>(`/pipelines/${id}`, { expectedVersion })
    )
  },

  createStage(pipelineId, expectedPipelineVersion, draft: StageDraft) {
    return guard(() =>
      httpClient.post<PipelineRecord>(`/pipelines/${pipelineId}/stages`, {
        ...draft,
        expectedPipelineVersion,
      })
    )
  },

  updateStage(pipelineId, stageId, patch: StagePatch) {
    return guard(() =>
      httpClient.patch<PipelineRecord>(
        `/pipelines/${pipelineId}/stages/${stageId}`,
        patch
      )
    )
  },

  archiveStage(pipelineId, stageId, expectedPipelineVersion, expectedVersion) {
    return guard(() =>
      httpClient.post<PipelineRecord>(
        `/pipelines/${pipelineId}/stages/${stageId}/archive`,
        { expectedPipelineVersion, expectedVersion }
      )
    )
  },

  restoreStage(pipelineId, stageId, expectedPipelineVersion, expectedVersion) {
    return guard(() =>
      httpClient.post<PipelineRecord>(
        `/pipelines/${pipelineId}/stages/${stageId}/restore`,
        { expectedPipelineVersion, expectedVersion }
      )
    )
  },

  removeStage(pipelineId, stageId, expectedPipelineVersion, expectedVersion) {
    return guard(() =>
      httpClient.delete<PipelineRecord>(
        `/pipelines/${pipelineId}/stages/${stageId}`,
        { expectedPipelineVersion, expectedVersion }
      )
    )
  },

  reorderStages(pipelineId, expectedPipelineVersion, items: StageOrderItem[]) {
    return guard(() =>
      httpClient.put<PipelineRecord>(`/pipelines/${pipelineId}/stages/order`, {
        expectedPipelineVersion,
        items,
      })
    )
  },

  reset() {},
}
