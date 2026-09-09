import { ApiError, httpClient, type QueryValue } from "@/shared/api"
import { CampaignsError } from "./campaigns-error"
import {
  toAudiencePreview,
  toCampaign,
  toCampaignDetail,
  toLookups,
  toTemplate,
  type ApiCampaign,
  type ApiCampaignDetail,
  type ApiLookups,
  type ApiTemplate,
} from "./campaigns-mapper"
import type {
  CampaignsListQuery,
  CampaignsService,
  RecipientsQuery,
} from "./campaigns-service"
import type {
  AudiencePreview,
  CampaignDraft,
  CampaignPreview,
  CampaignRecipient,
  ImportAudienceOutcome,
  TemplateSyncOutcome,
} from "../types/domain"

const listParams = (query: CampaignsListQuery): Record<string, QueryValue> => ({
  search: query.search,
  status: query.status === "all" ? undefined : query.status,
  cursor: query.cursor ?? undefined,
  limit: query.limit,
})

const recipientParams = (
  query: RecipientsQuery
): Record<string, QueryValue> => ({
  search: query.search,
  status: query.status === "all" ? undefined : query.status,
  cursor: query.cursor ?? undefined,
  limit: query.limit,
})

export function toCampaignsError(error: unknown): CampaignsError {
  if (!(error instanceof ApiError))
    return new CampaignsError("UNEXPECTED", "تعذر إكمال الطلب. حاول مرة أخرى.")
  const mapped: Record<string, CampaignsError["code"]> = {
    FORBIDDEN: "FORBIDDEN_ACTION",
    forbidden: "FORBIDDEN_ACTION",
    "out-of-scope": "FORBIDDEN_SCOPE",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION",
    validation: "VALIDATION",
    DUPLICATE_VALUE: "DUPLICATE",
    VERSION_CONFLICT: "CONFLICT",
    "campaign-not-editable": "CONFLICT",
    "campaign-not-launchable": "CONFLICT",
    "campaign-state-invalid": "CONFLICT",
    "campaign-active": "CONFLICT",
    "channel-not-configured": "CHANNEL_MISSING",
    "waba-unknown": "CHANNEL_MISSING",
    "provider-auth-failed": "META_AUTH",
    "provider-request-failed": "META_REJECTED",
    "provider-rate-limited": "RATE_LIMITED",
    "provider-unavailable": "UNAVAILABLE",
    "provider-response-invalid": "UNAVAILABLE",
    "provider-pagination-invalid": "UNAVAILABLE",
    "provider-pagination-cycle": "UNAVAILABLE",
    "provider-pagination-limit": "UNAVAILABLE",
    "template-invalid": "TEMPLATE_INVALID",
    "template-not-approved": "TEMPLATE_INVALID",
    "variables-mismatch": "VALIDATION",
    "audience-empty": "AUDIENCE_EMPTY",
    "audience-invalid": "VALIDATION",
    "phone-invalid": "VALIDATION",
    "cursor-invalid": "CURSOR",
    "cursor-query-mismatch": "CURSOR",
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
            : error.status === 503
              ? "CHANNEL_MISSING"
              : error.status === 0 || error.status >= 500
                ? "UNAVAILABLE"
                : "UNEXPECTED")
  return new CampaignsError(
    code,
    error.message,
    error.fieldErrors,
    error.currentVersion,
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
    if (error instanceof DOMException && error.name === "AbortError")
      throw error
    const mapped = toCampaignsError(error)
    if (forbiddenCode && mapped.code === "FORBIDDEN_ACTION")
      throw new CampaignsError(
        forbiddenCode,
        mapped.message,
        mapped.fieldErrors,
        mapped.currentVersion,
        mapped.retryable
      )
    throw mapped
  }
}

const draftBody = (draft: CampaignDraft) => ({
  name: draft.name.trim(),
  description: draft.description.trim(),
  templateId: draft.templateId,
  groupIds: draft.groupIds,
  variables: draft.variables,
  headerVariables: draft.headerVariables,
  throttlePerMinute: draft.throttlePerMinute,
  scheduledAt: draft.scheduledAt,
})

export const httpCampaignsService: CampaignsService = {
  async list(query, signal) {
    return guard(async () => {
      const page = await httpClient.getPage<ApiCampaign>(
        "/campaigns",
        listParams(query),
        signal
      )
      return {
        items: page.items.map(toCampaign),
        total: page.meta.total,
        nextCursor: page.meta.nextCursor ?? null,
      }
    }, "FORBIDDEN_SCOPE")
  },

  async detail(id, signal) {
    return guard(async () =>
      toCampaignDetail(
        await httpClient.get<ApiCampaignDetail>(
          `/campaigns/${id}`,
          undefined,
          signal
        )
      )
    )
  },

  async lookups(signal) {
    return guard(
      async () =>
        toLookups(
          await httpClient.get<ApiLookups>(
            "/campaigns/lookups",
            undefined,
            signal
          )
        ),
      "FORBIDDEN_SCOPE"
    )
  },

  async templates(signal) {
    return guard(async () => {
      const rows = await httpClient.get<ApiTemplate[]>(
        "/campaigns/templates",
        undefined,
        signal
      )
      return (rows ?? []).map(toTemplate)
    })
  },

  async syncTemplates() {
    return guard(async () =>
      httpClient.post<TemplateSyncOutcome>("/campaigns/templates/sync")
    )
  },

  async create(draft) {
    return guard(async () =>
      toCampaign(
        await httpClient.post<ApiCampaign>("/campaigns", draftBody(draft))
      )
    )
  },

  async update(id, draft, expectedVersion) {
    return guard(async () =>
      toCampaign(
        await httpClient.patch<ApiCampaign>(`/campaigns/${id}`, {
          ...draftBody(draft),
          expectedVersion,
        })
      )
    )
  },

  async remove(id) {
    return guard(async () => {
      await httpClient.delete<void>(`/campaigns/${id}`)
    })
  },

  /** A POST because the group list outgrows a query string. */
  async previewAudience(groupIds) {
    return guard(async () =>
      toAudiencePreview(
        await httpClient.post<Partial<AudiencePreview>>(
          "/campaigns/audience/preview",
          { groupIds }
        )
      )
    )
  },

  async importAudience(groupName, rows) {
    return guard(async () =>
      httpClient.post<ImportAudienceOutcome>("/campaigns/audience/import", {
        groupName: groupName.trim(),
        rows: rows.map((row) => ({
          name: row.name.trim(),
          phone: row.phone.trim(),
          email: row.email.trim(),
          company: row.company.trim(),
          role: row.role.trim(),
        })),
      })
    )
  },

  async preview(id, signal) {
    return guard(async () =>
      httpClient.get<CampaignPreview>(
        `/campaigns/${id}/preview`,
        undefined,
        signal
      )
    )
  },

  async recipients(id, query, signal) {
    return guard(async () => {
      const page = await httpClient.getPage<CampaignRecipient>(
        `/campaigns/${id}/recipients`,
        recipientParams(query),
        signal
      )
      return {
        items: page.items,
        total: page.meta.total,
        nextCursor: page.meta.nextCursor ?? null,
      }
    })
  },

  async exportRecipientsCsv(id) {
    return guard(async () =>
      httpClient.getText(`/campaigns/${id}/recipients/export`)
    )
  },

  async launch(id, scheduledAt) {
    return guard(async () =>
      toCampaignDetail(
        await httpClient.post<ApiCampaignDetail>(`/campaigns/${id}/launch`, {
          scheduledAt,
        })
      )
    )
  },

  async pause(id) {
    return guard(async () =>
      toCampaignDetail(
        await httpClient.post<ApiCampaignDetail>(`/campaigns/${id}/pause`)
      )
    )
  },

  async resume(id) {
    return guard(async () =>
      toCampaignDetail(
        await httpClient.post<ApiCampaignDetail>(`/campaigns/${id}/resume`)
      )
    )
  },

  async cancel(id) {
    return guard(async () =>
      toCampaignDetail(
        await httpClient.post<ApiCampaignDetail>(`/campaigns/${id}/cancel`)
      )
    )
  },

  async testSend(id, phone) {
    return guard(async () =>
      httpClient.post<{ providerMessageId: string }>(`/campaigns/${id}/test`, {
        phone: phone.trim(),
      })
    )
  },
}
