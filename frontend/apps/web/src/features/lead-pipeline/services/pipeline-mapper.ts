import type {
  Lead,
  LeadActivity,
  LeadPriority,
  LeadSource,
  LeadStageId,
  PipelineDefinition,
  PipelineStage,
} from "../types/domain"

export interface ApiStage {
  id: string
  recordId: string
  name: string
  description: string
  probability: number
  accent: string
  outcome: string
  position: number
}

export interface ApiDefinition {
  id: string
  code: string
  name: string
  stages: ApiStage[]
}

export interface ApiLeadActivity {
  id: string
  type: string
  label: string
  actorName: string
  occurredAt: string
}

export interface ApiLead {
  id: string
  contactId: string
  contactName: string
  phone: string
  email?: string
  source: string
  stageId: string
  stageRecordId: string
  assignedAgentId?: string
  priority: string
  value: number
  program: string
  outcome: string
  nextActionAt?: string
  createdAt: string
  updatedAt: string
  version: number
  activities: ApiLeadActivity[]
}

const STAGES: readonly LeadStageId[] = [
  "unassigned",
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
]
const PRIORITIES: readonly LeadPriority[] = ["low", "medium", "high", "urgent"]
const SOURCES: readonly LeadSource[] = [
  "whatsapp",
  "instagram",
  "facebook",
  "website",
  "phone",
  "manual",
]
const ACCENTS: readonly PipelineStage["accent"][] = [
  "slate",
  "blue",
  "sky",
  "amber",
  "violet",
  "green",
  "red",
]
const ACTIVITY_TYPES: readonly LeadActivity["type"][] = [
  "created",
  "stage_changed",
  "note",
]

const toStageId = (value: string): LeadStageId =>
  STAGES.includes(value as LeadStageId) ? (value as LeadStageId) : "unassigned"
const toPriority = (value: string): LeadPriority =>
  PRIORITIES.includes(value as LeadPriority)
    ? (value as LeadPriority)
    : "medium"
const toSource = (value: string): LeadSource =>
  SOURCES.includes(value as LeadSource) ? (value as LeadSource) : "manual"

/**
 * Activity kinds the board does not render (assignment, field edits) collapse
 * onto "note", which the timeline shows as a plain labelled entry.
 */
const toActivityType = (value: string): LeadActivity["type"] =>
  ACTIVITY_TYPES.includes(value as LeadActivity["type"])
    ? (value as LeadActivity["type"])
    : "note"

export function toDefinition(payload: ApiDefinition): PipelineDefinition {
  return {
    id: payload.id,
    name: payload.name,
    stages: payload.stages.map((stage) => ({
      id: toStageId(stage.id),
      name: stage.name,
      description: stage.description,
      probability: stage.probability,
      accent: ACCENTS.includes(stage.accent as PipelineStage["accent"])
        ? (stage.accent as PipelineStage["accent"])
        : "slate",
    })),
  }
}

export function toLead(row: ApiLead): Lead {
  return {
    id: row.id,
    contactId: row.contactId,
    contactName: row.contactName,
    phone: row.phone,
    email: row.email,
    source: toSource(row.source),
    stageId: toStageId(row.stageId),
    assignedAgentId: row.assignedAgentId,
    priority: toPriority(row.priority),
    value: row.value,
    program: row.program,
    nextActionAt: row.nextActionAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    activities: (row.activities ?? []).map(
      (activity): LeadActivity => ({
        id: activity.id,
        type: toActivityType(activity.type),
        label: activity.label,
        actorName: activity.actorName,
        occurredAt: activity.occurredAt,
      })
    ),
  }
}
