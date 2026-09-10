import type { AiAgent, UpdateAiAgentCommand } from "../types/domain"

export interface AiAgentService {
  list(signal?: AbortSignal): Promise<AiAgent[]>
  update(command: UpdateAiAgentCommand): Promise<AiAgent>
}
