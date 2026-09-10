import { useMockServices } from "@/shared/config/service-mode"
import type { AiAgentService } from "./ai-agent-service"
import { httpAiAgentService } from "./http-ai-agent-service"
import { mockAiAgentService } from "./mock-ai-agent-service"

export const aiAgentService: AiAgentService = useMockServices
  ? mockAiAgentService
  : httpAiAgentService
