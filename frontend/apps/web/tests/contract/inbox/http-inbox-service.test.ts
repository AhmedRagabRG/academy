import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, buildQueryString, httpClient } from "@/shared/api"
import {
  httpInboxService,
  inboxListParams,
  toInboxError,
} from "@/features/inbox/services/http-inbox-service"
import type {
  ConversationId,
  EmployeeId,
  NoteId,
  TagId,
} from "@/features/inbox/types/common"
import type { InboxListQuery } from "@/features/inbox/types/commands"

const conversationId = "550e8400-e29b-41d4-a716-446655440000" as ConversationId
const noteId = "550e8400-e29b-41d4-a716-446655440001" as NoteId
const tagId = "550e8400-e29b-41d4-a716-446655440002" as TagId
const apiConversation = {
  id: conversationId,
  customerId: "customer-id",
  platformId: "platform-id",
  status: "open",
  assignedEmployeeId: "employee-id",
  assignedTeamId: "team-id",
  tagIds: [tagId],
  unreadCount: 2,
  lastMessage: "مرحبا",
  lastActivityAt: "2026-08-10T08:00:00.000Z",
  version: 4,
  customer: {
    id: "customer-id",
    name: "عميل",
    phone: "0100",
    firstContactAt: "2026-08-01T08:00:00.000Z",
    lastActivityAt: "2026-08-10T08:00:00.000Z",
  },
  platform: {
    id: "platform-id",
    label: "WhatsApp",
    icon: "message",
    active: true,
  },
  employee: { id: "employee-id", label: "موظف", active: true, teamIds: [] },
  team: { id: "team-id", label: "فريق", active: true },
  tags: [{ id: tagId, label: "هام", color: "unknown-color", active: true }],
  messages: [
    {
      id: "message-id",
      conversationId,
      direction: "outgoing",
      senderName: "موظف",
      body: "مرحبا",
      sentAt: "2026-08-10T08:00:00.000Z",
      delivery: "queued",
      attachments: [
        {
          id: "attachment-id",
          kind: "pdf",
          fileName: "proof.pdf",
          sizeBytes: 10,
        },
        {
          id: "media-1",
          kind: "image",
          fileName: "photo.jpg",
          placeholder: true,
        },
      ],
    },
  ],
  notes: [
    {
      id: noteId,
      conversationId,
      authorEmployeeId: "employee-id",
      authorName: "موظف",
      content: "خاص",
      createdAt: "2026-08-10T08:00:00.000Z",
    },
  ],
  assignmentHistory: [
    {
      id: "history-id",
      conversationId,
      previous: { employeeId: null, teamId: null },
      next: { employeeId: "employee-id", teamId: "team-id" },
      actorName: "مدير",
      occurredAt: "2026-08-10T08:00:00.000Z",
    },
  ],
  systemEvents: [
    {
      id: "event-id",
      conversationId,
      label: "حدث",
      actorName: "مدير",
      occurredAt: "2026-08-10T08:00:00.000Z",
    },
  ],
}

const query: InboxListQuery = {
  search: "عميل",
  view: "team",
  platforms: ["platform-id"],
  statuses: ["open", "pending"],
  employeeIds: ["employee-id" as EmployeeId],
  teamIds: ["team-id" as never],
  tagIds: [tagId],
  unreadOnly: true,
  sort: "unread",
  cursor: "opaque-cursor",
  limit: 25,
}

beforeEach(() => vi.restoreAllMocks())

describe("HTTP InboxService transport contract", () => {
  it("serializes every InboxListDto field and preserves cursor metadata", async () => {
    expect(inboxListParams(query)).toEqual(query)
    expect(buildQueryString(inboxListParams(query))).toContain(
      "statuses=open%2Cpending"
    )
    vi.spyOn(httpClient, "getPage").mockResolvedValue({
      items: [apiConversation],
      meta: {
        total: 41,
        page: 1,
        limit: 25,
        totalPages: 2,
        nextCursor: "next",
      },
    })
    const signal = new AbortController().signal
    const page = await httpInboxService.list(query, signal)
    expect(httpClient.getPage).toHaveBeenCalledWith("/inbox", query, signal)
    expect(page).toMatchObject({ total: 41, nextCursor: "next" })
    expect(page.items[0]).toMatchObject({ id: conversationId, status: "open" })
    expect(page.items[0]!.tags[0]!.color).toBe("slate")
    expect(page.items[0]!.messages[0]!.delivery).toBe("queued")
  })

  it("maps detail, dashboard, lookups and multipart attachment reads", async () => {
    vi.spyOn(httpClient, "get")
      .mockResolvedValueOnce(apiConversation)
      .mockResolvedValueOnce({
        assigned: 1,
        open: 2,
        pending: 3,
        unread: 4,
        closedToday: 5,
      })
      .mockResolvedValueOnce({
        platforms: [],
        statuses: [{ id: "open", label: "مفتوحة" }],
        tags: [],
        teams: [],
        employees: [],
      })
    vi.spyOn(httpClient, "postForm").mockResolvedValue({
      id: "staged-id",
      kind: "pdf",
      fileName: "proof.pdf",
      sizeBytes: 1,
    })
    const signal = new AbortController().signal
    const detail = await httpInboxService.detail(conversationId, signal)
    expect(detail.messages[0]!.delivery).toBe("queued")
    // A provider-only attachment (no locally stored bytes) must round-trip
    // as preview-only with an undefined size, never a fabricated number.
    expect(detail.messages[0]!.attachments[1]).toMatchObject({
      id: "media-1",
      kind: "image",
      placeholder: true,
    })
    expect(detail.messages[0]!.attachments[1]!.sizeBytes).toBeUndefined()
    expect((await httpInboxService.dashboard(query, signal)).closedToday).toBe(
      5
    )
    expect((await httpInboxService.lookups(signal)).statuses[0]!.id).toBe(
      "open"
    )
    const file = new File(["x"], "proof.pdf", { type: "application/pdf" })
    expect((await httpInboxService.stageAttachment(file, signal)).id).toBe(
      "staged-id"
    )
    expect(httpClient.get).toHaveBeenNthCalledWith(
      1,
      `/inbox/${conversationId}`,
      undefined,
      signal
    )
    expect(httpClient.get).toHaveBeenNthCalledWith(
      2,
      "/inbox/dashboard",
      query,
      signal
    )
    expect(httpClient.get).toHaveBeenNthCalledWith(
      3,
      "/inbox/lookups",
      undefined,
      signal
    )
    expect(httpClient.postForm).toHaveBeenCalledWith(
      "/inbox/attachments",
      expect.any(FormData),
      signal
    )
    expect(
      vi.mocked(httpClient.postForm).mock.calls[0]![1].get("file")
    ).toMatchObject({
      name: "proof.pdf",
      size: 1,
      type: "application/pdf",
    })
  })

  it("maps every command to its route and exact body without actor claims", async () => {
    vi.spyOn(httpClient, "post").mockResolvedValue(apiConversation)
    vi.spyOn(httpClient, "patch").mockResolvedValue(apiConversation.notes[0])
    vi.spyOn(httpClient, "delete").mockResolvedValue(undefined)
    const attachment = {
      id: "staged-id",
      kind: "pdf" as const,
      fileName: "proof.pdf",
      sizeBytes: 10,
    }
    await httpInboxService.sendReply({
      conversationId,
      body: "رد",
      attachments: [attachment],
      retryToken: "retry-1",
    })
    await httpInboxService.markRead(conversationId)
    await httpInboxService.assign({
      conversationId,
      employeeId: "employee-id" as EmployeeId,
      teamId: null,
    })
    await httpInboxService.changeStatus(conversationId, "pending")
    await httpInboxService.toggleTag(conversationId, tagId)
    await httpInboxService.archive(conversationId)
    await httpInboxService.restore(conversationId)
    await httpInboxService.delete(conversationId)
    await httpInboxService.addNote(conversationId, "ملاحظة")
    await httpInboxService.editNote(conversationId, noteId, "معدلة")
    await httpInboxService.deleteNote(conversationId, noteId)
    expect(httpClient.post).toHaveBeenCalledWith(
      `/inbox/${conversationId}/replies`,
      { body: "رد", attachments: [attachment], retryToken: "retry-1" }
    )
    expect(httpClient.post).toHaveBeenCalledWith(
      `/inbox/${conversationId}/read`
    )
    expect(httpClient.post).toHaveBeenCalledWith(
      `/inbox/${conversationId}/assignment`,
      { employeeId: "employee-id", teamId: null }
    )
    expect(httpClient.post).toHaveBeenCalledWith(
      `/inbox/${conversationId}/status`,
      { status: "pending" }
    )
    expect(httpClient.post).toHaveBeenCalledWith(
      `/inbox/${conversationId}/tags/${tagId}/toggle`
    )
    expect(httpClient.post).toHaveBeenCalledWith(
      `/inbox/${conversationId}/archive`
    )
    expect(httpClient.post).toHaveBeenCalledWith(
      `/inbox/${conversationId}/restore`
    )
    expect(httpClient.delete).toHaveBeenCalledWith(`/inbox/${conversationId}`)
    expect(httpClient.post).toHaveBeenCalledWith(
      `/inbox/${conversationId}/notes`,
      { content: "ملاحظة" }
    )
    expect(httpClient.patch).toHaveBeenCalledWith(
      `/inbox/${conversationId}/notes/${noteId}`,
      { content: "معدلة" }
    )
    expect(httpClient.delete).toHaveBeenCalledWith(
      `/inbox/${conversationId}/notes/${noteId}`
    )
    for (const call of vi.mocked(httpClient.post).mock.calls) {
      if (call[1] !== undefined) {
        expect(call[1]).not.toHaveProperty("actor")
        expect(call[1]).not.toHaveProperty("permissions")
      }
    }
  })

  it("preserves aborts and makes HTTP-only actor/reset operations no-ops", async () => {
    const abort = new DOMException("aborted", "AbortError")
    vi.spyOn(httpClient, "get").mockRejectedValueOnce(abort)
    await expect(httpInboxService.detail(conversationId)).rejects.toBe(abort)
    expect(httpInboxService.setActor("employee" as EmployeeId)).toBeUndefined()
    expect(httpInboxService.reset()).toBeUndefined()
  })

  it.each([
    [new ApiError(403, "out-of-scope", "x"), "FORBIDDEN_SCOPE"],
    [new ApiError(403, "FORBIDDEN", "x"), "FORBIDDEN_ACTION"],
    [new ApiError(404, "NOT_FOUND", "x"), "NOT_FOUND"],
    [new ApiError(422, "VALIDATION_ERROR", "x"), "VALIDATION"],
    [new ApiError(409, "VERSION_CONFLICT", "x"), "CONFLICT"],
    [new ApiError(400, "cursor-invalid", "x"), "CURSOR"],
    [new ApiError(413, "FILE_TOO_LARGE", "x"), "UNSUPPORTED_ATTACHMENT"],
    [new ApiError(422, "attachment-mismatch", "x"), "INVALID_ATTACHMENT"],
    [new ApiError(422, "team-inactive", "x"), "INVALID_TEAM"],
    [new ApiError(422, "employee-inactive", "x"), "INVALID_EMPLOYEE"],
    [new ApiError(422, "assignment-mismatch", "x"), "INVALID_ASSIGNMENT"],
  ])("maps backend code without parsing prose: %#", (error, code) => {
    expect(toInboxError(error).code).toBe(code)
  })
})

describe("active InboxService selection", () => {
  it("selects HTTP by default and deterministic mock when configured", async () => {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_API_MOCKS", "false")
    expect(
      (await import("@/features/inbox/services/active-inbox-service"))
        .inboxService
    ).toBe(
      (await import("@/features/inbox/services/http-inbox-service"))
        .httpInboxService
    )
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_API_MOCKS", "true")
    expect(
      (await import("@/features/inbox/services/active-inbox-service"))
        .inboxService
    ).toBe(
      (await import("@/features/inbox/services/mock-inbox-service"))
        .mockInboxService
    )
    vi.unstubAllEnvs()
  })
})
