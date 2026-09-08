import type {
  PipelineDraft,
  PipelineRecord,
  StageDraft,
  StageEdit,
  StageOrderItem,
} from "../types/domain"

export interface PipelinePatch {
  expectedVersion: number
  name?: string
  isDefault?: boolean
}

export interface StagePatch extends Partial<StageEdit> {
  expectedPipelineVersion: number
  expectedVersion: number
}

export interface PipelineAdminService {
  list(signal?: AbortSignal): Promise<PipelineRecord[]>
  detail(id: string, signal?: AbortSignal): Promise<PipelineRecord>
  create(draft: PipelineDraft): Promise<PipelineRecord>
  update(id: string, patch: PipelinePatch): Promise<PipelineRecord>
  archive(id: string, expectedVersion: number): Promise<PipelineRecord>
  restore(id: string, expectedVersion: number): Promise<PipelineRecord>
  remove(id: string, expectedVersion: number): Promise<void>
  createStage(
    pipelineId: string,
    expectedPipelineVersion: number,
    draft: StageDraft
  ): Promise<PipelineRecord>
  updateStage(
    pipelineId: string,
    stageId: string,
    patch: StagePatch
  ): Promise<PipelineRecord>
  archiveStage(
    pipelineId: string,
    stageId: string,
    expectedPipelineVersion: number,
    expectedVersion: number
  ): Promise<PipelineRecord>
  restoreStage(
    pipelineId: string,
    stageId: string,
    expectedPipelineVersion: number,
    expectedVersion: number
  ): Promise<PipelineRecord>
  removeStage(
    pipelineId: string,
    stageId: string,
    expectedPipelineVersion: number,
    expectedVersion: number
  ): Promise<PipelineRecord>
  reorderStages(
    pipelineId: string,
    expectedPipelineVersion: number,
    items: StageOrderItem[]
  ): Promise<PipelineRecord>
  reset(): void
}
