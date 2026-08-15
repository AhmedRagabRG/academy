import { ApiError, httpClient, type QueryValue } from "@/shared/api"
import type { TicketListQuery, CreateTicketInput } from "../types/commands"
import type { TicketId } from "../types/common"
import {
  toTicketAttachment,
  toTicketConfiguration,
  toTicketDetail,
  toTicketPage,
  type ApiTicket,
  type ApiTicketAttachment,
  type ApiTicketConfiguration,
  type ApiTicketDashboard,
} from "./ticket-mapper"
import type { TicketService } from "./ticket-service"
import { TicketServiceError } from "./ticket-service-error"

/* eslint-disable @typescript-eslint/no-unused-vars -- TicketService keeps actor
 * parameters for mock authorization compatibility; HTTP authorization comes
 * exclusively from the authenticated session and must not serialize them. */

const path = (ticketId?: TicketId) =>
  ticketId ? `/tickets/${ticketId}` : "/tickets"

export const toTicketServiceError = (error: unknown): TicketServiceError => {
  if (!(error instanceof ApiError))
    return new TicketServiceError(
      "unexpected",
      "تعذر إكمال الطلب. حاول مرة أخرى."
    )

  const code = error.code.toLowerCase().replaceAll("_", "-")
  const common = [error.message, error.fieldErrors, error.currentVersion] as const
  if (error.status === 401 || error.status === 403 || code === "forbidden")
    return new TicketServiceError("forbidden", ...common)
  if (error.status === 404 || code === "not-found")
    return new TicketServiceError("not-found", ...common)
  if (code === "version-conflict")
    return new TicketServiceError("version-conflict", ...common)
  if (code === "invalid-transition")
    return new TicketServiceError("invalid-transition", ...common)
  if (code === "assignment-mismatch")
    return new TicketServiceError("assignment-mismatch", ...common)
  if (code === "unsupported-file-type")
    return new TicketServiceError("unsupported-attachment", ...common)
  if (code === "file-too-large")
    return new TicketServiceError("attachment-too-large", ...common)
  if (code === "file-unreadable")
    return new TicketServiceError("attachment-unreadable", ...common)
  if (code === "cursor-invalid")
    return new TicketServiceError("cursor-invalid", ...common)
  if (code === "cursor-query-mismatch")
    return new TicketServiceError("cursor-query-mismatch", ...common)
  if (code === "no-op") return new TicketServiceError("no-op", ...common)
  if (error.status === 422 || code === "validation-error" || code === "validation")
    return new TicketServiceError("validation", ...common)
  return new TicketServiceError("unexpected", ...common)
}

const guard = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw toTicketServiceError(error)
  }
}

export const ticketListQuery = (
  query: TicketListQuery
): Record<string, QueryValue> => {
  const statuses = [
    ...(query.filters?.statuses ?? []),
    ...(query.status ? [query.status] : []),
  ]
  return {
    mode: query.mode,
    search: query.search,
    status: statuses.length ? [...new Set(statuses)] : undefined,
    priority: query.filters?.priorities,
    teamId: query.filters?.teamIds,
    employeeId: query.filters?.employeeIds,
    departmentId: query.filters?.departmentIds,
    branchId: query.filters?.branchIds,
    tag: query.filters?.tags,
    createdBy: query.filters?.createdByIds,
    sort: query.sort,
    cursor: query.cursor,
    pageSize: query.pageSize,
  }
}

const createBody = (input: CreateTicketInput) => ({
  title: input.title,
  description: input.description,
  status: input.status,
  priority: input.priority,
  departmentId: input.departmentId,
  ...(input.branchId ? { branchId: input.branchId } : {}),
  ...(input.teamId ? { teamId: input.teamId } : {}),
  ...(input.employeeId ? { employeeId: input.employeeId } : {}),
  ...(input.customerId ? { customerId: input.customerId } : {}),
  ...(input.studentId ? { studentId: input.studentId } : {}),
  ...(input.conversationId ? { conversationId: input.conversationId } : {}),
  ...(input.dueAt ? { dueAt: input.dueAt } : {}),
  tags: input.tags,
})

const updateBody = (input: Partial<CreateTicketInput>) => ({
  ...(input.title !== undefined ? { title: input.title } : {}),
  ...(input.description !== undefined ? { description: input.description } : {}),
  ...(input.departmentId !== undefined
    ? { departmentId: input.departmentId }
    : {}),
  ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
  ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
  ...(input.studentId !== undefined ? { studentId: input.studentId } : {}),
  ...(input.conversationId !== undefined
    ? { conversationId: input.conversationId }
    : {}),
  ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
  ...(input.tags !== undefined ? { tags: input.tags } : {}),
})

export const httpTicketService: TicketService = {
  getConfiguration: (signal) =>
    guard(async () =>
      toTicketConfiguration(
        await httpClient.get<ApiTicketConfiguration>(
          "/tickets/configuration",
          undefined,
          signal
        )
      )
    ),
  listTickets: (query, signal) =>
    guard(async () =>
      toTicketPage(
        await httpClient.getPage<ApiTicket>(
          "/tickets",
          ticketListQuery(query),
          signal
        )
      )
    ),
  getTicket: (ticketId, _actor, signal) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.get<ApiTicket>(path(ticketId), undefined, signal)
      )
    ),
  getDashboard: (_actor, signal) =>
    guard(() =>
      httpClient.get<ApiTicketDashboard>(
        "/tickets/dashboard",
        undefined,
        signal
      )
    ),
  createTicket: (input, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.post<ApiTicket>("/tickets", createBody(input))
      )
    ),
  updateTicket: (ticketId, input, expectedVersion, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.patch<ApiTicket>(path(ticketId), {
          ...updateBody(input),
          expectedVersion,
        })
      )
    ),
  changeStatus: (ticketId, status, expectedVersion, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.post<ApiTicket>(`${path(ticketId)}/status`, {
          status,
          expectedVersion,
        })
      )
    ),
  changePriority: (ticketId, priority, expectedVersion, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.post<ApiTicket>(`${path(ticketId)}/priority`, {
          priority,
          expectedVersion,
        })
      )
    ),
  changeAssignment: (ticketId, assignment, expectedVersion, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.post<ApiTicket>(`${path(ticketId)}/assignment`, {
          ...assignment,
          expectedVersion,
        })
      )
    ),
  addComment: (ticketId, message, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.post<ApiTicket>(`${path(ticketId)}/comments`, {
          message,
        })
      )
    ),
  editComment: (ticketId, commentId, message, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.patch<ApiTicket>(
          `${path(ticketId)}/comments/${commentId}`,
          { message }
        )
      )
    ),
  deleteComment: (ticketId, commentId, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.delete<ApiTicket>(
          `${path(ticketId)}/comments/${commentId}`
        )
      )
    ),
  uploadAttachment: (ticketId, file, _actor, signal) =>
    guard(async () => {
      const form = new FormData()
      form.append("file", file, file.name)
      return toTicketAttachment(
        await httpClient.postForm<ApiTicketAttachment>(
          `${path(ticketId)}/attachments`,
          form,
          signal
        )
      )
    }),
  archiveTicket: (ticketId, expectedVersion, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.post<ApiTicket>(`${path(ticketId)}/archive`, {
          expectedVersion,
        })
      )
    ),
  restoreTicket: (ticketId, expectedVersion, _actor) =>
    guard(async () =>
      toTicketDetail(
        await httpClient.post<ApiTicket>(`${path(ticketId)}/restore`, {
          expectedVersion,
        })
      )
    ),
  deleteTicket: (ticketId, _actor) =>
    guard(async () => {
      await httpClient.delete<void>(path(ticketId))
    }),
  /** HTTP mode owns no local state; resetting it is intentionally a no-op. */
  reset: () => undefined,
}

export type HttpTicketService = TicketService
