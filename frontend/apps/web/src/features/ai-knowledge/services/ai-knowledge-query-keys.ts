import type { KnowledgeBaseId } from "../types/domain"

export const aiKnowledgeKeys = {
  all: ["ai-knowledge"] as const,
  bases: () => [...aiKnowledgeKeys.all, "bases"] as const,
  sources: (id: KnowledgeBaseId) => [...aiKnowledgeKeys.all, "sources", id] as const,
}
