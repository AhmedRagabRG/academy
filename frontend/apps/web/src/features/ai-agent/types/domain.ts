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
  /** null means 24/7. Absent days are closed. Values are "HH:MM-HH:MM". */
  workingHours: Record<string, string> | null
  outsideHoursBehaviour: "silent" | "fallback_message"
  allowedTools: string[]
  allowedCrmFields: string[]
  dataCollectionFields: DataCollectionField[]
  routingRules: RoutingRule[]
  version: number
  updatedAt: string
}

export interface DataCollectionField {
  key: string
  label: string
}

export interface RoutingRule {
  id: string
  category: string
  categoryLabel: string
  teamId: string | null
  priority: TicketPriority
  active: boolean
  displayOrder: number
}

export type TicketPriority = "low" | "medium" | "high" | "critical"

export interface UpsertRoutingRuleCommand {
  agentId: AiAgentId
  ruleId?: string
  category: string
  categoryLabel: string
  teamId: string | null
  priority: TicketPriority
  active?: boolean
  displayOrder?: number
}

export interface DeleteRoutingRuleCommand {
  agentId: AiAgentId
  ruleId: string
}

export interface UpdateAiAgentCommand
  extends Partial<
    Omit<AiAgent, "id" | "version" | "updatedAt" | "name" | "routingRules">
  > {
  id: AiAgentId
  expectedVersion: number
  name?: string
}
