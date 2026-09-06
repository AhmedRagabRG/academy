import { admissionsPipeline } from "../config/pipeline-configuration"
import {
  pipelineAgents,
  pipelineContacts,
  pipelineLeads,
} from "../data/pipeline-fixtures"
import type { Lead, LeadStageId, PipelineStage } from "../types/domain"
import { PipelineError } from "./pipeline-error"
import type { PipelineListQuery, PipelineService } from "./pipeline-service"

const clone = <T>(value: T): T => structuredClone(value)
const normalize = (value: string) => value.trim().toLocaleLowerCase("ar")
const ACTOR = "أحمد محمد"

let leads: Lead[] = clone(pipelineLeads)

const find = (id: string): Lead => {
  const lead = leads.find((item) => item.id === id)
  if (!lead) throw new PipelineError("NOT_FOUND", "الفرصة غير موجودة")
  return lead
}

const save = (next: Lead): Lead => {
  leads = leads.map((lead) => (lead.id === next.id ? next : lead))
  return clone(next)
}

const activity = (
  type: Lead["activities"][number]["type"],
  label: string
) => ({
  id: `activity-${crypto.randomUUID()}`,
  type,
  label,
  actorName: ACTOR,
  occurredAt: new Date().toISOString(),
})

const outcomeOf = (stageId: LeadStageId) =>
  stageId === "won" ? "won" : stageId === "lost" ? "lost" : "open"

const matches = (lead: Lead, query: PipelineListQuery) => {
  const needle = normalize(query.search)
  const searchable = normalize(
    [lead.contactName, lead.phone, lead.email, lead.program]
      .filter(Boolean)
      .join(" ")
  )
  return (
    (!needle || searchable.includes(needle)) &&
    (!query.agentId ||
      (query.agentId === "unassigned"
        ? !lead.assignedAgentId
        : lead.assignedAgentId === query.agentId)) &&
    (!query.source || lead.source === query.source) &&
    (!query.priority || lead.priority === query.priority) &&
    (!query.outcome || outcomeOf(lead.stageId) === query.outcome)
  )
}

/** Synchronous reads for the inbox mock adapter's CRM link. */
export const findMockLeadByContact = (contactId: string): Lead | null =>
  leads.find((lead) => lead.contactId === contactId) ?? null

export const mockPipelineId = admissionsPipeline.id
export const mockPipelineStages = (): PipelineStage[] => admissionsPipeline.stages

/**
 * The in-memory pipeline backend, holding the same rules as the API: a stage
 * move records an activity, and a lead always belongs to a known contact.
 */
export const mockPipelineService: PipelineService = {
  definition: () => Promise.resolve(clone(admissionsPipeline)),
  agents: () => Promise.resolve(clone(pipelineAgents)),
  contacts: () => Promise.resolve(clone(pipelineContacts)),
  leads: (query) =>
    Promise.resolve(clone(leads.filter((lead) => matches(lead, query)))),

  createLead(draft) {
    const contact = pipelineContacts.find((item) => item.id === draft.contactId)
    if (!contact)
      return Promise.reject(
        new PipelineError("VALIDATION", "جهة الاتصال غير صالحة")
      )
    const now = new Date().toISOString()
    const lead: Lead = {
      id: `lead-${crypto.randomUUID()}`,
      contactId: contact.id,
      contactName: contact.name,
      phone: contact.phone,
      email: contact.email,
      source: contact.source,
      stageId: draft.assignedAgentId ? "new" : "unassigned",
      assignedAgentId: draft.assignedAgentId || undefined,
      priority: draft.priority,
      value: Number(draft.value) || 0,
      program: draft.program.trim(),
      nextActionAt: draft.nextActionAt
        ? new Date(draft.nextActionAt).toISOString()
        : undefined,
      createdAt: now,
      updatedAt: now,
      activities: [activity("created", "أُنشئت الفرصة من جهة الاتصال")],
    }
    leads = [lead, ...leads]
    return Promise.resolve(clone(lead))
  },

  updateLead(leadId, draft) {
    const lead = find(leadId)
    return Promise.resolve(
      save({
        ...lead,
        assignedAgentId: draft.assignedAgentId || undefined,
        priority: draft.priority,
        value: Number(draft.value) || 0,
        program: draft.program.trim(),
        nextActionAt: draft.nextActionAt
          ? new Date(draft.nextActionAt).toISOString()
          : undefined,
        updatedAt: new Date().toISOString(),
      })
    )
  },

  moveLead(leadId, stageId) {
    const lead = find(leadId)
    if (lead.stageId === stageId) return Promise.resolve(clone(lead))
    const stage = admissionsPipeline.stages.find((item) => item.id === stageId)
    if (!stage)
      return Promise.reject(new PipelineError("VALIDATION", "المرحلة غير صالحة"))
    return Promise.resolve(
      save({
        ...lead,
        stageId,
        updatedAt: new Date().toISOString(),
        activities: [
          activity("stage_changed", `نُقلت الفرصة إلى «${stage.name}»`),
          ...lead.activities,
        ],
      })
    )
  },

  addNote(leadId, note) {
    const lead = find(leadId)
    return Promise.resolve(
      save({
        ...lead,
        updatedAt: new Date().toISOString(),
        activities: [activity("note", note.trim()), ...lead.activities],
      })
    )
  },

  reset() {
    leads = clone(pipelineLeads)
  },
}
