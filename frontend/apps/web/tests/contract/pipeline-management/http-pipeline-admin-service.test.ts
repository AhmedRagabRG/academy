import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, httpClient } from "@/shared/api"
import { httpPipelineAdminService } from "@/features/pipeline-management/services/http-pipeline-admin-service"
import type { PipelineRecord } from "@/features/pipeline-management/types/domain"

const pipeline = { id: "pipeline-id" } as PipelineRecord

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(httpClient, "get").mockResolvedValue(pipeline)
  vi.spyOn(httpClient, "post").mockResolvedValue(pipeline)
  vi.spyOn(httpClient, "patch").mockResolvedValue(pipeline)
  vi.spyOn(httpClient, "put").mockResolvedValue(pipeline)
  vi.spyOn(httpClient, "delete").mockResolvedValue(pipeline)
})

describe("HTTP pipeline administration transport contract", () => {
  it("sends both aggregate and record versions for every stage mutation", async () => {
    const draft = {
      code: "qualified",
      name: "مؤهلة",
      description: "",
      probability: 60,
      accent: "green" as const,
      outcome: "open" as const,
      isEntry: false,
    }

    await httpPipelineAdminService.createStage("pipeline-id", 7, draft)
    await httpPipelineAdminService.updateStage("pipeline-id", "stage-id", {
      expectedPipelineVersion: 8,
      expectedVersion: 3,
      name: "مؤهلة للتسجيل",
    })
    await httpPipelineAdminService.archiveStage("pipeline-id", "stage-id", 9, 4)
    await httpPipelineAdminService.restoreStage(
      "pipeline-id",
      "stage-id",
      10,
      5
    )
    await httpPipelineAdminService.removeStage("pipeline-id", "stage-id", 11, 6)

    expect(httpClient.post).toHaveBeenCalledWith(
      "/pipelines/pipeline-id/stages",
      { ...draft, expectedPipelineVersion: 7 }
    )
    expect(httpClient.patch).toHaveBeenCalledWith(
      "/pipelines/pipeline-id/stages/stage-id",
      {
        expectedPipelineVersion: 8,
        expectedVersion: 3,
        name: "مؤهلة للتسجيل",
      }
    )
    expect(httpClient.post).toHaveBeenCalledWith(
      "/pipelines/pipeline-id/stages/stage-id/archive",
      { expectedPipelineVersion: 9, expectedVersion: 4 }
    )
    expect(httpClient.post).toHaveBeenCalledWith(
      "/pipelines/pipeline-id/stages/stage-id/restore",
      { expectedPipelineVersion: 10, expectedVersion: 5 }
    )
    expect(httpClient.delete).toHaveBeenCalledWith(
      "/pipelines/pipeline-id/stages/stage-id",
      { expectedPipelineVersion: 11, expectedVersion: 6 }
    )
  })

  it("sends a complete reorder contract and maps version conflicts", async () => {
    await httpPipelineAdminService.reorderStages("pipeline-id", 4, [
      { id: "stage-b", expectedVersion: 2 },
      { id: "stage-a", expectedVersion: 5 },
    ])
    expect(httpClient.put).toHaveBeenCalledWith(
      "/pipelines/pipeline-id/stages/order",
      {
        expectedPipelineVersion: 4,
        items: [
          { id: "stage-b", expectedVersion: 2 },
          { id: "stage-a", expectedVersion: 5 },
        ],
      }
    )

    vi.mocked(httpClient.patch).mockRejectedValueOnce(
      new ApiError(409, "VERSION_CONFLICT", "تم تعديل السجل", [], 12)
    )
    await expect(
      httpPipelineAdminService.update("pipeline-id", {
        expectedVersion: 11,
        name: "اسم متعارض",
      })
    ).rejects.toMatchObject({ code: "CONFLICT", currentVersion: 12 })
  })
})
