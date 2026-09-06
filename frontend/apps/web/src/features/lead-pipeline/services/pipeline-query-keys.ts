import type { PipelineListQuery } from "./pipeline-service"

export const pipelineKeys = {
  all: ["lead-pipeline"] as const,
  definition: ["lead-pipeline", "definition"] as const,
  agents: ["lead-pipeline", "agents"] as const,
  contacts: ["lead-pipeline", "contacts"] as const,
  leadLists: () => ["lead-pipeline", "leads"] as const,
  leads: (query: PipelineListQuery) =>
    [
      "lead-pipeline",
      "leads",
      query.search,
      query.agentId,
      query.source,
      query.priority,
      query.outcome,
    ] as const,
}
