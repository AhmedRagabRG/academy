import type {
  KnowledgeBase,
  KnowledgeBaseId,
  KnowledgeSource,
  KnowledgeSourceId,
} from "../types/domain"

/** Wire shapes as the backend projects them (see KnowledgeService.project). */
export interface ApiKnowledgeBase {
  id: string
  name: string
  description: string | null
  status: string
  version: number
  sourceCount?: number
  createdAt: string
  updatedAt: string
}
export interface ApiKnowledgeSource {
  id: string
  knowledgeBaseId: string
  kind: string
  title: string
  visibility: string
  status: string
  failureReason: string | null
  chunkCount: number
  tokenCount: number
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
  updatedAt: string
}

export const toKnowledgeBase = (row: ApiKnowledgeBase): KnowledgeBase => ({
  id: row.id as KnowledgeBaseId,
  name: row.name,
  description: row.description,
  status: row.status as KnowledgeBase["status"],
  sourceCount: row.sourceCount ?? 0,
  version: row.version,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

export const toKnowledgeSource = (row: ApiKnowledgeSource): KnowledgeSource => ({
  id: row.id as KnowledgeSourceId,
  knowledgeBaseId: row.knowledgeBaseId as KnowledgeBaseId,
  kind: row.kind as KnowledgeSource["kind"],
  title: row.title,
  visibility: row.visibility as KnowledgeSource["visibility"],
  status: row.status as KnowledgeSource["status"],
  failureReason: row.failureReason,
  chunkCount: row.chunkCount,
  tokenCount: row.tokenCount,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})
