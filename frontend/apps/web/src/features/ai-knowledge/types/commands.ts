import type { KnowledgeBaseId, KnowledgeSourceId, KnowledgeVisibility } from "./domain"

export interface CreateKnowledgeBaseCommand { name: string; description?: string }
export interface UpdateKnowledgeBaseCommand {
  id: KnowledgeBaseId
  expectedVersion: number
  name?: string
  description?: string
  status?: "active" | "inactive"
}
export interface DeleteKnowledgeBaseCommand { id: KnowledgeBaseId; expectedVersion: number }
export interface CreateFileSourceCommand {
  knowledgeBaseId: KnowledgeBaseId
  file: File
  visibility: KnowledgeVisibility
}
export interface CreateTextSourceCommand {
  knowledgeBaseId: KnowledgeBaseId
  title: string
  rawText: string
  visibility: KnowledgeVisibility
}
export interface SourceCommand { sourceId: KnowledgeSourceId }
