import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, httpClient } from "@/shared/api"
import {
  httpCampaignsService,
  toCampaignsError,
} from "@/features/campaigns/services/http-campaigns-service"
import type {
  CampaignDraft,
  WhatsappTemplate,
} from "@/features/campaigns/types/domain"

const approvedNamedTemplate = {
  id: "template-named",
  name: "welcome_series",
  language: "ar",
  category: "MARKETING",
  status: "approved",
  bodyText: "مرحبًا {{first_name}}",
  // The backend omits empty token arrays; the mapper must still produce them.
} as unknown as WhatsappTemplate

const draft: CampaignDraft = {
  name: "  اليوم المفتوح  ",
  description: "  دعوة عامة  ",
  templateId: "template-ar",
  groupIds: ["group-a", "group-b"],
  variables: [
    { position: 1, source: "contact", value: "name", fallback: "عميلنا" },
    { position: 2, source: "literal", value: "الاثنين", fallback: "" },
  ],
  headerVariables: [
    { position: 1, source: "literal", value: "دعوة", fallback: "" },
  ],
  throttlePerMinute: 180,
  scheduledAt: "2026-09-20T10:00:00.000Z",
}

beforeEach(() => vi.restoreAllMocks())

describe("HTTP campaigns service transport contract", () => {
  it("sends the exact create and update payloads, trimming free text but not touching bindings", async () => {
    vi.spyOn(httpClient, "post").mockResolvedValue({
      id: "campaign-1",
      template: approvedNamedTemplate,
      groupIds: [],
      variables: [],
      headerVariables: [],
      stats: {},
    })
    vi.spyOn(httpClient, "patch").mockResolvedValue({
      id: "campaign-1",
      template: approvedNamedTemplate,
      groupIds: [],
      variables: [],
      headerVariables: [],
      stats: {},
    })

    await httpCampaignsService.create(draft)
    await httpCampaignsService.update("campaign-1", draft, 4)

    const expectedBody = {
      name: "اليوم المفتوح",
      description: "دعوة عامة",
      templateId: "template-ar",
      groupIds: ["group-a", "group-b"],
      variables: draft.variables,
      headerVariables: draft.headerVariables,
      throttlePerMinute: 180,
      scheduledAt: "2026-09-20T10:00:00.000Z",
    }
    expect(httpClient.post).toHaveBeenCalledWith("/campaigns", expectedBody)
    expect(httpClient.patch).toHaveBeenCalledWith("/campaigns/campaign-1", {
      ...expectedBody,
      expectedVersion: 4,
    })
  })

  it("sends the lifecycle, preview, and test-send routes with their real bodies", async () => {
    vi.spyOn(httpClient, "post").mockResolvedValue({
      id: "campaign-1",
      template: approvedNamedTemplate,
      groupIds: [],
      variables: [],
      headerVariables: [],
      stats: {},
      events: [],
    })

    await httpCampaignsService.launch("campaign-1", "2026-09-20T10:00:00.000Z")
    await httpCampaignsService.pause("campaign-1")
    await httpCampaignsService.resume("campaign-1")
    await httpCampaignsService.cancel("campaign-1")
    await httpCampaignsService.testSend("campaign-1", "  +201000000000  ")
    await httpCampaignsService.previewAudience(["group-a", "group-b"])
    await httpCampaignsService.syncTemplates()

    expect(httpClient.post).toHaveBeenCalledWith(
      "/campaigns/campaign-1/launch",
      {
        scheduledAt: "2026-09-20T10:00:00.000Z",
      }
    )
    expect(httpClient.post).toHaveBeenCalledWith("/campaigns/campaign-1/pause")
    expect(httpClient.post).toHaveBeenCalledWith("/campaigns/campaign-1/resume")
    expect(httpClient.post).toHaveBeenCalledWith("/campaigns/campaign-1/cancel")
    expect(httpClient.post).toHaveBeenCalledWith("/campaigns/campaign-1/test", {
      phone: "+201000000000",
    })
    expect(httpClient.post).toHaveBeenCalledWith(
      "/campaigns/audience/preview",
      {
        groupIds: ["group-a", "group-b"],
      }
    )
    expect(httpClient.post).toHaveBeenCalledWith("/campaigns/templates/sync")
  })

  it("trims every imported audience row and the group name", async () => {
    vi.spyOn(httpClient, "post").mockResolvedValue({
      group: { id: "group-x", name: "x", description: "", memberCount: 1 },
      imported: 1,
      linked: 0,
      skipped: [],
    })
    await httpCampaignsService.importAudience("  جمهور جديد  ", [
      {
        name: "  هدى  ",
        phone: "  +201000000000  ",
        email: "  a@test.com  ",
        company: "  شركة  ",
        role: "  مدير  ",
      },
    ])
    expect(httpClient.post).toHaveBeenCalledWith("/campaigns/audience/import", {
      groupName: "جمهور جديد",
      rows: [
        {
          name: "هدى",
          phone: "+201000000000",
          email: "a@test.com",
          company: "شركة",
          role: "مدير",
        },
      ],
    })
  })

  it("drops the synthetic 'all' status filter from list and recipient queries", async () => {
    vi.spyOn(httpClient, "getPage").mockResolvedValue({
      items: [],
      meta: { total: 0, page: 1, limit: 25, totalPages: 0 },
    })
    await httpCampaignsService.list({
      search: "  سبتمبر  ",
      status: "all",
      cursor: null,
      limit: 25,
    })
    await httpCampaignsService.recipients("campaign-1", {
      search: "",
      status: "all",
      cursor: "cursor-1",
      limit: 50,
    })
    expect(httpClient.getPage).toHaveBeenCalledWith(
      "/campaigns",
      { search: "  سبتمبر  ", status: undefined, cursor: undefined, limit: 25 },
      undefined
    )
    expect(httpClient.getPage).toHaveBeenCalledWith(
      "/campaigns/campaign-1/recipients",
      { search: "", status: undefined, cursor: "cursor-1", limit: 50 },
      undefined
    )
  })

  it("defaults missing placeholder token arrays when mapping templates and lookups", async () => {
    vi.spyOn(httpClient, "get")
      .mockResolvedValueOnce([approvedNamedTemplate])
      .mockResolvedValueOnce({
        templates: [approvedNamedTemplate],
        groups: [],
        customFields: [],
        contactTokens: [],
        channel: { linked: true },
      })
    const templates = await httpCampaignsService.templates()
    const lookups = await httpCampaignsService.lookups()

    expect(templates[0]).toMatchObject({
      variableTokens: [],
      headerVariableTokens: [],
      status: "approved",
    })
    expect(lookups.templates[0]).toMatchObject({
      variableTokens: [],
      headerVariableTokens: [],
    })
  })

  it("preserves AbortError instead of mapping it to a campaigns error", async () => {
    const abort = new DOMException("aborted", "AbortError")
    vi.spyOn(httpClient, "get").mockRejectedValueOnce(abort)
    await expect(httpCampaignsService.lookups()).rejects.toBe(abort)
  })

  it.each([
    [new ApiError(409, "DUPLICATE_VALUE", "duplicate"), "DUPLICATE"],
    [new ApiError(409, "VERSION_CONFLICT", "stale", [], 5), "CONFLICT"],
    [new ApiError(422, "template-invalid", "bad template"), "TEMPLATE_INVALID"],
    [new ApiError(422, "template-not-approved", "pending"), "TEMPLATE_INVALID"],
    [new ApiError(422, "variables-mismatch", "mismatch"), "VALIDATION"],
    [new ApiError(422, "audience-invalid", "bad group"), "VALIDATION"],
    [new ApiError(422, "audience-empty", "no audience"), "AUDIENCE_EMPTY"],
    [
      new ApiError(503, "channel-not-configured", "no channel"),
      "CHANNEL_MISSING",
    ],
    [new ApiError(422, "waba-unknown", "no waba"), "CHANNEL_MISSING"],
    [new ApiError(422, "provider-auth-failed", "expired"), "META_AUTH"],
    [new ApiError(422, "provider-request-failed", "rejected"), "META_REJECTED"],
    [new ApiError(503, "provider-rate-limited", "slow down"), "RATE_LIMITED"],
    [new ApiError(502, "provider-unavailable", "down"), "UNAVAILABLE"],
    [new ApiError(400, "cursor-invalid", "bad cursor"), "CURSOR"],
    [new ApiError(404, "NOT_FOUND", "missing"), "NOT_FOUND"],
    [new ApiError(403, "FORBIDDEN", "forbidden"), "FORBIDDEN_ACTION"],
    [new ApiError(0, "NETWORK_ERROR", "offline"), "UNAVAILABLE"],
  ])("maps backend error code %s to %s", (error, code) => {
    expect(toCampaignsError(error)).toMatchObject({ code })
  })

  it("keeps the conflicting record's current version on a version conflict", () => {
    const error = new ApiError(409, "VERSION_CONFLICT", "stale", [], 5)
    expect(toCampaignsError(error)).toMatchObject({
      code: "CONFLICT",
      currentVersion: 5,
    })
  })
})

describe("active campaigns service selection", () => {
  it("uses real HTTP by default and only switches to the mock behind the explicit flag", async () => {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_API_MOCKS", "false")
    const httpMode =
      await import("@/features/campaigns/services/active-campaigns-service")
    const http =
      await import("@/features/campaigns/services/http-campaigns-service")
    expect(httpMode.campaignsService).toBe(http.httpCampaignsService)

    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_API_MOCKS", "true")
    const mockMode =
      await import("@/features/campaigns/services/active-campaigns-service")
    const mock =
      await import("@/features/campaigns/services/mock-campaigns-service")
    expect(mockMode.campaignsService).toBe(mock.mockCampaignsService)
    vi.unstubAllEnvs()
  })
})
