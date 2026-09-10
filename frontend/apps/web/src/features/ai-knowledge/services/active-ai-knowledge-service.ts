import { useMockServices } from "@/shared/config/service-mode"
import type { AiKnowledgeService } from "./ai-knowledge-service"
import { httpAiKnowledgeService } from "./http-ai-knowledge-service"
import { mockAiKnowledgeService } from "./mock-ai-knowledge-service"

export const aiKnowledgeService: AiKnowledgeService = useMockServices
  ? mockAiKnowledgeService
  : httpAiKnowledgeService
