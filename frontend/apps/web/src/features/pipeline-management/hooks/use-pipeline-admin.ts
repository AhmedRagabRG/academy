"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { pipelineAdminService } from "../services/active-pipeline-admin-service"
import { pipelineAdminKeys } from "../services/pipeline-admin-query-keys"
import type {
  PipelinePatch,
  StagePatch,
} from "../services/pipeline-admin-service"
import type {
  PipelineDraft,
  PipelineRecord,
  StageDraft,
  StageOrderItem,
} from "../types/domain"

export function usePipelineAdmin(initialPipelineId?: string) {
  const client = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPipelineId ?? null
  )

  const list = useQuery({
    queryKey: pipelineAdminKeys.list(),
    queryFn: ({ signal }) => pipelineAdminService.list(signal),
  })
  const pipelines = list.data ?? []
  const effectiveId =
    (selectedId && pipelines.some((item) => item.id === selectedId)
      ? selectedId
      : null) ??
    pipelines[0]?.id ??
    null

  const detail = useQuery({
    queryKey: pipelineAdminKeys.detail(effectiveId ?? ""),
    queryFn: ({ signal }) => pipelineAdminService.detail(effectiveId!, signal),
    enabled: Boolean(effectiveId),
  })

  const refreshList = () =>
    client.invalidateQueries({ queryKey: pipelineAdminKeys.list() })
  const refreshDetail = (id: string) =>
    client.invalidateQueries({ queryKey: pipelineAdminKeys.detail(id) })
  const refreshAll = (id?: string) =>
    Promise.all([refreshList(), id ? refreshDetail(id) : Promise.resolve()])

  const create = useMutation({
    mutationFn: (draft: PipelineDraft) => pipelineAdminService.create(draft),
    onSuccess: async (pipeline) => {
      setSelectedId(pipeline.id)
      await refreshAll(pipeline.id)
    },
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PipelinePatch }) =>
      pipelineAdminService.update(id, patch),
    onSuccess: (pipeline) => refreshAll(pipeline.id),
  })

  const archive = useMutation({
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string
      expectedVersion: number
    }) => pipelineAdminService.archive(id, expectedVersion),
    onSuccess: (pipeline) => refreshAll(pipeline.id),
  })

  const restore = useMutation({
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string
      expectedVersion: number
    }) => pipelineAdminService.restore(id, expectedVersion),
    onSuccess: (pipeline) => refreshAll(pipeline.id),
  })

  const remove = useMutation({
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string
      expectedVersion: number
    }) => pipelineAdminService.remove(id, expectedVersion),
    onSuccess: (_result, variables) => {
      if (selectedId === variables.id) setSelectedId(null)
      return refreshList()
    },
  })

  const createStage = useMutation({
    mutationFn: ({
      pipelineId,
      expectedPipelineVersion,
      draft,
    }: {
      pipelineId: string
      expectedPipelineVersion: number
      draft: StageDraft
    }) =>
      pipelineAdminService.createStage(
        pipelineId,
        expectedPipelineVersion,
        draft
      ),
    onSuccess: (pipeline) => refreshAll(pipeline.id),
  })

  const updateStage = useMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      patch,
    }: {
      pipelineId: string
      stageId: string
      patch: StagePatch
    }) => pipelineAdminService.updateStage(pipelineId, stageId, patch),
    onSuccess: (pipeline) => refreshAll(pipeline.id),
  })

  const archiveStage = useMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      expectedPipelineVersion,
      expectedVersion,
    }: {
      pipelineId: string
      stageId: string
      expectedPipelineVersion: number
      expectedVersion: number
    }) =>
      pipelineAdminService.archiveStage(
        pipelineId,
        stageId,
        expectedPipelineVersion,
        expectedVersion
      ),
    onSuccess: (pipeline) => refreshAll(pipeline.id),
  })

  const restoreStage = useMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      expectedPipelineVersion,
      expectedVersion,
    }: {
      pipelineId: string
      stageId: string
      expectedPipelineVersion: number
      expectedVersion: number
    }) =>
      pipelineAdminService.restoreStage(
        pipelineId,
        stageId,
        expectedPipelineVersion,
        expectedVersion
      ),
    onSuccess: (pipeline) => refreshAll(pipeline.id),
  })

  const removeStage = useMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      expectedPipelineVersion,
      expectedVersion,
    }: {
      pipelineId: string
      stageId: string
      expectedPipelineVersion: number
      expectedVersion: number
    }) =>
      pipelineAdminService.removeStage(
        pipelineId,
        stageId,
        expectedPipelineVersion,
        expectedVersion
      ),
    onSuccess: (pipeline) => refreshAll(pipeline.id),
  })

  /**
   * The stage order is applied to the cache before the request settles, so a
   * click on "move up/down" reads as instant. A rejection restores the exact
   * snapshot taken before the optimistic write, and either outcome ends in a
   * refetch so the UI never keeps a version number the server did not mint.
   */
  const reorder = useMutation({
    mutationFn: ({
      pipelineId,
      expectedPipelineVersion,
      items,
    }: {
      pipelineId: string
      expectedPipelineVersion: number
      items: StageOrderItem[]
    }) =>
      pipelineAdminService.reorderStages(
        pipelineId,
        expectedPipelineVersion,
        items
      ),
    onMutate: async ({ pipelineId, items }) => {
      const key = pipelineAdminKeys.detail(pipelineId)
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<PipelineRecord>(key)
      if (previous) {
        const order = items.map((item) => item.id)
        client.setQueryData<PipelineRecord>(key, {
          ...previous,
          stages: [...previous.stages]
            .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
            .map((stage, index) => ({ ...stage, position: index })),
        })
      }
      return { key, previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) client.setQueryData(context.key, context.previous)
    },
    onSettled: (_data, _error, variables) => refreshAll(variables.pipelineId),
  })

  return {
    pipelines,
    isListLoading: list.isPending,
    listError: list.error,
    selectedId: effectiveId,
    selectPipeline: setSelectedId,
    pipeline: detail.data ?? null,
    isDetailLoading: detail.isPending && Boolean(effectiveId),
    detailError: detail.error,

    createPipeline: (draft: PipelineDraft) => create.mutateAsync(draft),
    renamePipeline: (id: string, name: string, expectedVersion: number) =>
      update.mutateAsync({ id, patch: { expectedVersion, name } }),
    setDefaultPipeline: (id: string, expectedVersion: number) =>
      update.mutateAsync({ id, patch: { expectedVersion, isDefault: true } }),
    archivePipeline: (id: string, expectedVersion: number) =>
      archive.mutateAsync({ id, expectedVersion }),
    restorePipeline: (id: string, expectedVersion: number) =>
      restore.mutateAsync({ id, expectedVersion }),
    removePipeline: (id: string, expectedVersion: number) =>
      remove.mutateAsync({ id, expectedVersion }),

    createStage: (
      pipelineId: string,
      expectedPipelineVersion: number,
      draft: StageDraft
    ) =>
      createStage.mutateAsync({ pipelineId, expectedPipelineVersion, draft }),
    updateStage: (pipelineId: string, stageId: string, patch: StagePatch) =>
      updateStage.mutateAsync({ pipelineId, stageId, patch }),
    archiveStage: (
      pipelineId: string,
      stageId: string,
      expectedPipelineVersion: number,
      expectedVersion: number
    ) =>
      archiveStage.mutateAsync({
        pipelineId,
        stageId,
        expectedPipelineVersion,
        expectedVersion,
      }),
    restoreStage: (
      pipelineId: string,
      stageId: string,
      expectedPipelineVersion: number,
      expectedVersion: number
    ) =>
      restoreStage.mutateAsync({
        pipelineId,
        stageId,
        expectedPipelineVersion,
        expectedVersion,
      }),
    removeStage: (
      pipelineId: string,
      stageId: string,
      expectedPipelineVersion: number,
      expectedVersion: number
    ) =>
      removeStage.mutateAsync({
        pipelineId,
        stageId,
        expectedPipelineVersion,
        expectedVersion,
      }),
    reorderStages: (
      pipelineId: string,
      expectedPipelineVersion: number,
      items: StageOrderItem[]
    ) => reorder.mutateAsync({ pipelineId, expectedPipelineVersion, items }),
  }
}
