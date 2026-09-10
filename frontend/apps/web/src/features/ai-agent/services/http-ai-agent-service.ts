import { httpClient } from "@/shared/api/http-client"
import type { AiAgentService } from "./ai-agent-service"
import type { AiAgent, AiAgentId } from "../types/domain"

interface ApiAiAgent extends Omit<AiAgent, "id"> {
  id: string
}
const toAgent = (row: ApiAiAgent): AiAgent => ({
  ...row,
  id: row.id as AiAgentId,
})

export const httpAiAgentService: AiAgentService = {
  async list(signal) {
    const rows = await httpClient.get<ApiAiAgent[]>(
      "/ai/agents",
      undefined,
      signal,
    )
    return rows.map(toAgent)
  },
  async update({ id, ...body }) {
    return toAgent(await httpClient.patch<ApiAiAgent>(`/ai/agents/${id}`, body))
  },
}
