export type KnowledgeBaseId = string & { readonly __brand: "KnowledgeBaseId" }
export type KnowledgeSourceId = string & { readonly __brand: "KnowledgeSourceId" }

export type KnowledgeBaseStatus = "active" | "inactive" | "archived"
export type KnowledgeSourceStatus = "pending" | "processing" | "ready" | "failed"
export type KnowledgeSourceKind = "file" | "text"
export type KnowledgeVisibility = "customer-facing" | "internal"

export interface KnowledgeBase {
  id: KnowledgeBaseId
  name: string
  description: string | null
  status: KnowledgeBaseStatus
  sourceCount: number
  version: number
  createdAt: string
  updatedAt: string
}

export interface KnowledgeSource {
  id: KnowledgeSourceId
  knowledgeBaseId: KnowledgeBaseId
  kind: KnowledgeSourceKind
  title: string
  visibility: KnowledgeVisibility
  status: KnowledgeSourceStatus
  failureReason: string | null
  chunkCount: number
  tokenCount: number
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
  updatedAt: string
}

/** True while anything is still indexing, which is what drives list polling. */
export const isIndexing = (sources: KnowledgeSource[]): boolean =>
  sources.some((s) => s.status === "pending" || s.status === "processing")
