import type {
  Lead,
  LeadDraft,
  PipelineAgent,
  PipelineContact,
  PipelineDefinition,
  PipelineFilters,
  LeadStageId,
} from "../types/domain"

export interface PipelineListQuery {
  search: string
  agentId: string
  source: PipelineFilters["source"]
  priority: PipelineFilters["priority"]
  outcome: PipelineFilters["outcome"]
}

export interface PipelineService {
  definition(signal?: AbortSignal): Promise<PipelineDefinition>
  agents(signal?: AbortSignal): Promise<PipelineAgent[]>
  contacts(signal?: AbortSignal): Promise<PipelineContact[]>
  leads(query: PipelineListQuery, signal?: AbortSignal): Promise<Lead[]>
  createLead(draft: LeadDraft): Promise<Lead>
  updateLead(leadId: string, draft: LeadDraft): Promise<Lead>
  moveLead(leadId: string, stageId: LeadStageId): Promise<Lead>
  addNote(leadId: string, note: string): Promise<Lead>
  reset(): void
}
