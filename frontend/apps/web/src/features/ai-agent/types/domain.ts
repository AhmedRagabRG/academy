export type AiAgentId = string & { readonly __brand: "AiAgentId" }

export interface AiAgent {
  id: AiAgentId
  name: string
  enabled: boolean
  systemInstructions: string
  tone: string
  responseLanguage: string
  maxResponseChars: number
  enabledPlatformCodes: string[]
  /** null means the AI never resumes on its own after a human replies. */
  resumeAfterMinutes: number | null
  fallbackMessage: string
  handoffMessage: string
  knowledgeBaseIds: string[]
  version: number
  updatedAt: string
}

export interface UpdateAiAgentCommand
  extends Partial<
    Omit<AiAgent, "id" | "version" | "updatedAt" | "name">
  > {
  id: AiAgentId
  expectedVersion: number
  name?: string
}
