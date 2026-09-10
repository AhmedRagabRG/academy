import { httpClient } from "@/shared/api/http-client"
import { useMockServices } from "@/shared/config/service-mode"
import type {
  DeleteRoutingRuleCommand,
  RoutingRule,
  UpsertRoutingRuleCommand,
} from "../types/domain"

export interface AiRoutingRuleService {
  upsert(command: UpsertRoutingRuleCommand): Promise<RoutingRule>
  remove(command: DeleteRoutingRuleCommand): Promise<void>
}

const root = (agentId: string) => `/ai/agents/${agentId}/routing-rules`

const httpService: AiRoutingRuleService = {
  async upsert({ agentId, ruleId, ...body }) {
    return ruleId
      ? httpClient.patch<RoutingRule>(`${root(agentId)}/${ruleId}`, body)
      : httpClient.post<RoutingRule>(root(agentId), body)
  },
  async remove({ agentId, ruleId }) {
    await httpClient.delete<void>(`${root(agentId)}/${ruleId}`)
  },
}

let mockRules: RoutingRule[] = []
let sequence = 0
const mockService: AiRoutingRuleService = {
  upsert: ({ ruleId, category, categoryLabel, teamId, priority, active, displayOrder }) => {
    const rule: RoutingRule = {
      id: ruleId ?? `rule-${++sequence}`,
      category,
      categoryLabel,
      teamId,
      priority,
      active: active ?? true,
      displayOrder: displayOrder ?? 0,
    }
    mockRules = ruleId
      ? mockRules.map((item) => (item.id === ruleId ? rule : item))
      : [...mockRules, rule]
    return Promise.resolve(rule)
  },
  remove: ({ ruleId }) => {
    mockRules = mockRules.filter((rule) => rule.id !== ruleId)
    return Promise.resolve()
  },
}

export const aiRoutingRuleService: AiRoutingRuleService = useMockServices
  ? mockService
  : httpService
