import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, httpClient } from "@/shared/api"
import {
  httpTicketService,
  ticketListQuery,
  toTicketServiceError,
} from "@/features/tickets/services/http-ticket-service"
import type { TicketActor } from "@/features/tickets/types/commands"
import type { TicketId } from "@/features/tickets/types/common"

const id = "550e8400-e29b-41d4-a716-446655440000" as TicketId
const actor: TicketActor = {
  userId: "browser-user",
  name: "Browser User",
  teamIds: ["browser-team"],
  permissions: ["tickets.delete"],
}

const apiTicket = {
  id,
  number: "TKT-1001",
  title: "Ticket title",
  description: "Ticket description",
  status: "in-progress",
  lastActiveStatus: "in-progress",
  priority: "high",
  departmentId: "department-id",
  teamId: "team-id",
  tags: ["urgent"],
  createdBy: "creator-id",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-02T10:00:00.000Z",
  version: 3,
  departmentName: "Support",
  teamName: "Support team",
  commentCount: 1,
  capabilities: {
    edit: true,
    changeStatus: true,
    changePriority: true,
    assignTeam: true,
    assignEmployee: true,
    comment: true,
    attach: true,
    archive: true,
    restore: false,
    delete: true,
  },
  comments: [
    {
      id: "comment-id",
      ticketId: id,
      authorId: "creator-id",
      authorName: "Creator",
      message: "Comment",
      createdAt: "2026-08-01T11:00:00.000Z",
    },
  ],
  activity: [
    {
      id: "activity-id",
      ticketId: id,
      type: "created",
      actorId: "creator-id",
      actorName: "Creator",
      occurredAt: "2026-08-01T10:00:00.000Z",
      message: "created",
      payload: { ignored: true },
    },
  ],
  attachments: [
    {
      id: "attachment-id",
      ticketId: id,
      name: "proof.pdf",
      mimeType: "application/pdf",
      sizeBytes: 42,
      uploadedBy: "creator-id",
      uploadedAt: "2026-08-01T12:00:00.000Z",
      previewUrl: `/api/v1/tickets/${id}/attachments/attachment-id`,
    },
  ],
}

beforeEach(() => vi.restoreAllMocks())

describe("HTTP TicketService transport contract", () => {
  it("serializes the backend TicketListDto names and keeps the column cursor", () => {
    expect(
      ticketListQuery({
        actor,
        mode: "active",
        search: "  ticket ",
        status: "todo",
        cursor: "column-two-cursor",
        pageSize: 25,
        sort: "priority",
        filters: {
          statuses: ["waiting"],
          priorities: ["critical"],
          teamIds: ["team-a"],
          employeeIds: ["employee-a"],
          departmentIds: ["department-a"],
          branchIds: ["branch-a"],
          tags: ["urgent"],
          createdByIds: ["creator-a"],
        },
      })
    ).toEqual({
      mode: "active",
      search: "  ticket ",
      status: ["waiting", "todo"],
      priority: ["critical"],
      teamId: ["team-a"],
      employeeId: ["employee-a"],
      departmentId: ["department-a"],
      branchId: ["branch-a"],
      tag: ["urgent"],
      createdBy: ["creator-a"],
      sort: "priority",
      cursor: "column-two-cursor",
      pageSize: 25,
    })
  })

  it("maps configuration, cursor pages, detail, dashboard, and attachment", async () => {
    vi.spyOn(httpClient, "get")
      .mockResolvedValueOnce({
        statuses: [{ id: "todo", name: "To do", order: 1 }],
        priorities: [{ id: "high", name: "High", tone: "high", order: 1 }],
        departments: [], branches: [], teams: [{ id: "team-id", name: "Team" }],
        employees: [{ id: "employee-id", name: "Employee", teamIds: ["team-id"] }],
        customers: [], students: [], conversations: [], tags: ["urgent"],
        attachment: { maxBytes: 10, acceptedTypes: ["application/pdf"] },
      })
      .mockResolvedValueOnce(apiTicket)
      .mockResolvedValueOnce({ mine: 1, team: 2, open: 3, waiting: 4, critical: 5, closedToday: 6 })
    vi.spyOn(httpClient, "getPage").mockResolvedValue({
      items: [apiTicket],
      meta: { total: 9, page: 1, limit: 1, totalPages: 9, nextCursor: "next-column-cursor" },
    })
    vi.spyOn(httpClient, "postForm").mockResolvedValue(apiTicket.attachments[0]!)

    const signal = new AbortController().signal
    const configuration = await httpTicketService.getConfiguration(signal)
    const page = await httpTicketService.listTickets({ status: "todo" }, signal)
    const detail = await httpTicketService.getTicket(id, actor, signal)
    const dashboard = await httpTicketService.getDashboard(actor, signal)
    const attachment = await httpTicketService.uploadAttachment(
      id,
      new File(["x"], "proof.pdf", { type: "application/pdf" }),
      actor,
      signal
    )

    expect(configuration.teams[0]).toEqual({ id: "team-id", name: "Team" })
    expect(page).toMatchObject({ total: 9, nextCursor: "next-column-cursor" })
    expect(page.items[0]).not.toHaveProperty("comments")
    expect(detail.comments[0]).toMatchObject({ id: "comment-id", message: "Comment" })
    expect(detail.activity[0]).not.toHaveProperty("payload")
    expect(detail.attachments[0]!.previewUrl).toContain("/api/v1/tickets/")
    expect(dashboard.closedToday).toBe(6)
    expect(attachment.name).toBe("proof.pdf")
    expect(httpClient.getPage).toHaveBeenCalledWith(
      "/tickets",
      expect.objectContaining({ status: ["todo"] }),
      signal
    )
    expect(httpClient.postForm).toHaveBeenCalledWith(
      `/tickets/${id}/attachments`,
      expect.any(FormData),
      signal
    )
    const form = vi.mocked(httpClient.postForm).mock.calls[0]?.[1]
    expect(form?.get("file")).toBeInstanceOf(File)
  })

  it("maps every mutation to its real route, method, and body without actor claims", async () => {
    vi.spyOn(httpClient, "post").mockResolvedValue(apiTicket)
    vi.spyOn(httpClient, "patch").mockResolvedValue(apiTicket)
    vi.spyOn(httpClient, "delete")
      .mockResolvedValueOnce(apiTicket)
      .mockResolvedValueOnce(undefined)
    const input = {
      title: "Ticket title",
      description: "Ticket description",
      status: "todo" as const,
      priority: "high" as const,
      departmentId: "department-id",
      tags: ["urgent"],
    }

    await httpTicketService.createTicket(input, actor)
    await httpTicketService.updateTicket(id, { title: "Changed title" }, 3, actor)
    await httpTicketService.changeStatus(id, "done", 3, actor)
    await httpTicketService.changePriority(id, "critical", 3, actor)
    await httpTicketService.changeAssignment(id, { teamId: "team-id", employeeId: "employee-id" }, 3, actor)
    await httpTicketService.addComment(id, "New comment", actor)
    await httpTicketService.editComment(id, "comment-id", "Edited", actor)
    await httpTicketService.deleteComment(id, "comment-id", actor)
    await httpTicketService.archiveTicket(id, 3, actor)
    await httpTicketService.restoreTicket(id, 4, actor)
    await httpTicketService.deleteTicket(id, actor)

    expect(httpClient.post).toHaveBeenCalledWith("/tickets", input)
    expect(httpClient.patch).toHaveBeenCalledWith(`/tickets/${id}`, {
      title: "Changed title",
      expectedVersion: 3,
    })
    expect(httpClient.post).toHaveBeenCalledWith(`/tickets/${id}/status`, { status: "done", expectedVersion: 3 })
    expect(httpClient.post).toHaveBeenCalledWith(`/tickets/${id}/priority`, { priority: "critical", expectedVersion: 3 })
    expect(httpClient.post).toHaveBeenCalledWith(`/tickets/${id}/assignment`, { teamId: "team-id", employeeId: "employee-id", expectedVersion: 3 })
    expect(httpClient.post).toHaveBeenCalledWith(`/tickets/${id}/comments`, { message: "New comment" })
    expect(httpClient.patch).toHaveBeenCalledWith(`/tickets/${id}/comments/comment-id`, { message: "Edited" })
    expect(httpClient.delete).toHaveBeenCalledWith(`/tickets/${id}/comments/comment-id`)
    expect(httpClient.post).toHaveBeenCalledWith(`/tickets/${id}/archive`, { expectedVersion: 3 })
    expect(httpClient.post).toHaveBeenCalledWith(`/tickets/${id}/restore`, { expectedVersion: 4 })
    expect(httpClient.delete).toHaveBeenCalledWith(`/tickets/${id}`)
    for (const call of [...vi.mocked(httpClient.post).mock.calls, ...vi.mocked(httpClient.patch).mock.calls]) {
      expect(call[1]).not.toHaveProperty("actor")
      expect(call[1]).not.toHaveProperty("permissions")
      expect(call[1]).not.toHaveProperty("userId")
    }
  })

  it("preserves read and upload aborts", async () => {
    const abort = new DOMException("aborted", "AbortError")
    vi.spyOn(httpClient, "get").mockRejectedValueOnce(abort)
    vi.spyOn(httpClient, "postForm").mockRejectedValueOnce(abort)
    await expect(httpTicketService.getTicket(id, actor)).rejects.toBe(abort)
    await expect(
      httpTicketService.uploadAttachment(id, new File(["x"], "x.pdf"), actor)
    ).rejects.toBe(abort)
  })

  it.each([
    [new ApiError(403, "FORBIDDEN", "forbidden"), "forbidden"],
    [new ApiError(404, "NOT_FOUND", "missing"), "not-found"],
    [new ApiError(409, "VERSION_CONFLICT", "stale", [], 7), "version-conflict"],
    [new ApiError(409, "invalid-transition", "transition"), "invalid-transition"],
    [new ApiError(422, "assignment-mismatch", "assignment"), "assignment-mismatch"],
    [new ApiError(422, "UNSUPPORTED_FILE_TYPE", "type"), "unsupported-attachment"],
    [new ApiError(413, "FILE_TOO_LARGE", "size"), "attachment-too-large"],
    [new ApiError(400, "cursor-invalid", "cursor"), "cursor-invalid"],
    [new ApiError(409, "cursor-query-mismatch", "cursor"), "cursor-query-mismatch"],
    [new ApiError(409, "no-op", "same"), "no-op"],
  ])("maps backend error codes without reading prose: %#", (error, code) => {
    expect(toTicketServiceError(error)).toMatchObject({ code })
  })

  it("documents reset as an HTTP no-op", () => {
    expect(httpTicketService.reset()).toBeUndefined()
  })
})

describe("active TicketService selection", () => {
  it("selects HTTP by default and mock when NEXT_PUBLIC_API_MOCKS is true", async () => {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_API_MOCKS", "false")
    const httpMode = await import("@/features/tickets/services/active-ticket-service")
    const http = await import("@/features/tickets/services/http-ticket-service")
    expect(httpMode.ticketService).toBe(http.httpTicketService)

    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_API_MOCKS", "true")
    const mockMode = await import("@/features/tickets/services/active-ticket-service")
    const mock = await import("@/features/tickets/services/mock-ticket-service")
    expect(mockMode.ticketService).toBe(mock.mockTicketService)
    vi.unstubAllEnvs()
  })
})
