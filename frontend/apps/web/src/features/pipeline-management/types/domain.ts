export type PipelineStageAccent =
  "slate" | "blue" | "sky" | "amber" | "violet" | "green" | "red"
export type PipelineStageOutcome = "open" | "won" | "lost"

export interface PipelineStageRecord {
  id: string
  code: string
  name: string
  description: string
  probability: number
  accent: PipelineStageAccent
  outcome: PipelineStageOutcome
  position: number
  isEntry: boolean
  active: boolean
  version: number
  leadCount: number
}

export interface PipelineRecord {
  id: string
  code: string
  name: string
  isDefault: boolean
  active: boolean
  version: number
  createdAt: string
  updatedAt: string
  leadCount: number
  stages: PipelineStageRecord[]
}

export interface PipelineDraft {
  code: string
  name: string
}

export interface StageDraft {
  code: string
  name: string
  description: string
  probability: number
  accent: PipelineStageAccent
  outcome: PipelineStageOutcome
  isEntry: boolean
}

export interface StageEdit {
  name: string
  description: string
  probability: number
  accent: PipelineStageAccent
  outcome: PipelineStageOutcome
  isEntry: boolean
}

export interface StageOrderItem {
  id: string
  expectedVersion: number
}
