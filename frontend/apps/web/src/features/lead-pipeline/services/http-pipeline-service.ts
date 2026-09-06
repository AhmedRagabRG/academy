import { ApiError, httpClient, type QueryValue } from "@/shared/api"
import { PipelineError } from "./pipeline-error"
import {
  toDefinition,
  toLead,
  type ApiDefinition,
  type ApiLead,
} from "./pipeline-mapper"
import type { PipelineListQuery, PipelineService } from "./pipeline-service"
import type { LeadDraft, LeadStageId, PipelineContact } from "../types/domain"

export function toPipelineError(error: unknown): PipelineError {
  if (!(error instanceof ApiError))
    return new PipelineError("UNEXPECTED", "تعذر إكمال الطلب. حاول مرة أخرى.")
  const mapped: Record<string, PipelineError["code"]> = {
    FORBIDDEN: "FORBIDDEN_ACTION",
    forbidden: "FORBIDDEN_ACTION",
    "out-of-scope": "FORBIDDEN_SCOPE",
    "contact-out-of-scope": "FORBIDDEN_SCOPE",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION",
    validation: "VALIDATION",
    "value-invalid": "VALIDATION",
    "stage-invalid": "VALIDATION",
    "agent-invalid": "VALIDATION",
    "contact-invalid": "VALIDATION",
    VERSION_CONFLICT: "CONFLICT",
    "pipeline-not-configured": "NOT_CONFIGURED",
  }
  const code =
    mapped[error.code] ??
    (error.status === 404
      ? "NOT_FOUND"
      : error.status === 401 || error.status === 403
        ? "FORBIDDEN_ACTION"
        : error.status === 422
          ? "VALIDATION"
          : error.status === 409
            ? "CONFLICT"
            : error.status === 0 || error.status >= 500
              ? "UNAVAILABLE"
              : "UNEXPECTED")
  return new PipelineError(
    code,
    error.message,
    error.fieldErrors,
    error.status === 0 || error.status >= 500
  )
}

async function guard<T>(
  operation: () => Promise<T>,
  forbiddenCode?: "FORBIDDEN_SCOPE"
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    const mapped = toPipelineError(error)
    if (forbiddenCode && mapped.code === "FORBIDDEN_ACTION")
      throw new PipelineError(
        forbiddenCode,
        mapped.message,
        mapped.fieldErrors,
        mapped.retryable
      )
    throw mapped
  }
}

/**
 * Stage codes are the board's vocabulary; the API addresses stages by row id.
 * The lookup is filled from whichever definition read happened first and
 * refreshed on a miss, so a renamed or added stage cannot wedge a move.
 */
const stageIds = new Map<string, string>()

async function stageRecordId(stageId: LeadStageId): Promise<string> {
  if (!stageIds.has(stageId)) {
    const payload = await httpClient.get<ApiDefinition>(
      "/lead-pipeline/definition"
    )
    for (const stage of payload.stages) stageIds.set(stage.id, stage.recordId)
  }
  const recordId = stageIds.get(stageId)
  if (!recordId)
    throw new PipelineError("VALIDATION", "المرحلة غير موجودة في هذا المسار")
  return recordId
}

const leadParams = (query: PipelineListQuery): Record<string, QueryValue> => ({
  search: query.search,
  agentId: query.agentId && query.agentId !== "unassigned" ? query.agentId : undefined,
  sources: query.source ? [query.source] : [],
  priority: query.priority || undefined,
  outcome: query.outcome || undefined,
  limit: 500,
})

const draftBody = (draft: LeadDraft) => ({
  contactId: draft.contactId,
  assignedAgentId: draft.assignedAgentId || undefined,
  priority: draft.priority,
  value: draft.value || "0",
  program: draft.program.trim(),
  nextActionAt: draft.nextActionAt
    ? new Date(draft.nextActionAt).toISOString()
    : undefined,
})

export const httpPipelineService: PipelineService = {
  async definition(signal) {
    return guard(async () => {
      const payload = await httpClient.get<ApiDefinition>(
        "/lead-pipeline/definition",
        undefined,
        signal
      )
      for (const stage of payload.stages) stageIds.set(stage.id, stage.recordId)
      return toDefinition(payload)
    }, "FORBIDDEN_SCOPE")
  },

  async agents(signal) {
    return guard(async () =>
      httpClient.get<{ id: string; name: string }[]>(
        "/lead-pipeline/agents",
        undefined,
        signal
      )
    )
  },

  /** The pipeline picks an existing contact, so it reads the CRM directory. */
  async contacts(signal) {
    return guard(async () => {
      const page = await httpClient.getPage<{
        id: string
        name: string
        phone: string
        email?: string
        source: string
      }>("/contacts", { limit: 200 }, signal)
      return page.items.map(
        (contact): PipelineContact => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          source: (contact.source === "import"
            ? "manual"
            : contact.source) as PipelineContact["source"],
        })
      )
    }, "FORBIDDEN_SCOPE")
  },

  async leads(query, signal) {
    return guard(async () => {
      const page = await httpClient.getPage<ApiLead>(
        "/lead-pipeline/leads",
        leadParams(query),
        signal
      )
      const rows = page.items.map(toLead)
      // "unassigned" is an agent filter the API does not model, because an
      // absent owner is not a value it can be compared against.
      return query.agentId === "unassigned"
        ? rows.filter((lead) => !lead.assignedAgentId)
        : rows
    }, "FORBIDDEN_SCOPE")
  },

  async createLead(draft) {
    return guard(async () =>
      toLead(
        await httpClient.post<ApiLead>("/lead-pipeline/leads", draftBody(draft))
      )
    )
  },

  async updateLead(leadId, draft) {
    return guard(async () =>
      toLead(
        await httpClient.patch<ApiLead>(`/lead-pipeline/leads/${leadId}`, {
          assignedAgentId: draft.assignedAgentId || null,
          priority: draft.priority,
          value: draft.value || "0",
          program: draft.program.trim(),
          nextActionAt: draft.nextActionAt
            ? new Date(draft.nextActionAt).toISOString()
            : null,
        })
      )
    )
  },

  async moveLead(leadId, stageId) {
    return guard(async () =>
      toLead(
        await httpClient.post<ApiLead>(`/lead-pipeline/leads/${leadId}/stage`, {
          stageId: await stageRecordId(stageId),
        })
      )
    )
  },

  async addNote(leadId, note) {
    return guard(async () =>
      toLead(
        await httpClient.post<ApiLead>(`/lead-pipeline/leads/${leadId}/notes`, {
          content: note,
        })
      )
    )
  },

  reset() {
    stageIds.clear()
  },
}
