import type { AiAgentService } from "./ai-agent-service"
import type { AiAgent, AiAgentId } from "../types/domain"

let agent: AiAgent = {
  id: "agent-1" as AiAgentId,
  name: "المساعد الذكي الافتراضي",
  enabled: false,
  systemInstructions:
    "ساعد عملاء أكاديمية السلام بدقة ووضوح، ولا تدّع معرفة معلومات غير متاحة.",
  tone: "ودود ومهني",
  responseLanguage: "ar",
  maxResponseChars: 1200,
  enabledPlatformCodes: [],
  resumeAfterMinutes: null,
  fallbackMessage:
    "عذرًا، لا أملك معلومات كافية للإجابة بدقة. سأحوّل المحادثة إلى أحد موظفينا.",
  handoffMessage: "سيكمل أحد موظفينا مساعدتك في أقرب وقت.",
  knowledgeBaseIds: [],
  version: 1,
  updatedAt: new Date().toISOString(),
}

export const mockAiAgentService: AiAgentService = {
  list: () => Promise.resolve([agent]),
  update: (command) => {
    const changes = { ...command } as Partial<AiAgent>
    delete (changes as { id?: unknown }).id
    delete (changes as { expectedVersion?: unknown }).expectedVersion
    agent = {
      ...agent,
      ...changes,
      version: agent.version + 1,
      updatedAt: new Date().toISOString(),
    }
    return Promise.resolve(agent)
  },
}
