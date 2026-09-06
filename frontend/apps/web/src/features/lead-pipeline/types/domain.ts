export type LeadStageId =
  "unassigned" | "new" | "contacted" | "qualified" | "proposal" | "won" | "lost"

export type LeadPriority = "low" | "medium" | "high" | "urgent"
export type LeadSource =
  "whatsapp" | "instagram" | "facebook" | "website" | "phone" | "manual"

export type LeadOutcome = "open" | "won" | "lost"

export interface PipelineStage {
  id: LeadStageId
  name: string
  description: string
  probability: number
  accent: "slate" | "blue" | "sky" | "amber" | "violet" | "green" | "red"
}

export interface PipelineDefinition {
  id: string
  name: string
  stages: PipelineStage[]
}

export interface PipelineAgent {
  id: string
  name: string
}

export interface PipelineContact {
  id: string
  name: string
  phone: string
  email?: string
  source: LeadSource
}

export interface LeadActivity {
  id: string
  type: "created" | "stage_changed" | "note"
  label: string
  actorName: string
  occurredAt: string
}

export interface Lead {
  id: string
  contactId: string
  contactName: string
  phone: string
  email?: string
  source: LeadSource
  stageId: LeadStageId
  assignedAgentId?: string
  priority: LeadPriority
  value: number
  program: string
  nextActionAt?: string
  createdAt: string
  updatedAt: string
  activities: LeadActivity[]
}

export interface LeadDraft {
  contactId: string
  assignedAgentId: string
  priority: LeadPriority
  value: string
  program: string
  nextActionAt: string
}

export interface PipelineFilters {
  query: string
  agentId: string
  source: LeadSource | ""
  priority: LeadPriority | ""
  outcome: LeadOutcome | ""
}
