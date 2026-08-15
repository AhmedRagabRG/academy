import { ApiError, httpClient, type QueryValue } from "@/shared/api"
import type { InboxService } from "./inbox-service"
import { InboxError } from "./inbox-error"
import {
  toAttachment,
  toConversation,
  toDashboard,
  toInternalNote,
  toLookups,
  type ApiAttachment,
  type ApiConversation,
  type ApiLookups,
} from "./inbox-mapper"
import type { InboxListQuery } from "../types/commands"
import type { InboxDashboard } from "../types/projections"
import type { NoteId } from "../types/common"

export const inboxListParams = (
  query: InboxListQuery
): Record<string, QueryValue> => ({
  search: query.search,
  view: query.view,
  platforms: query.platforms,
  statuses: query.statuses,
  employeeIds: query.employeeIds,
  teamIds: query.teamIds,
  branchIds: query.branchIds,
  tagIds: query.tagIds,
  unreadOnly: query.unreadOnly,
  sort: query.sort,
  cursor: query.cursor,
  limit: query.limit,
})

export function toInboxError(error: unknown): InboxError {
  if (!(error instanceof ApiError))
    return new InboxError("UNEXPECTED", "تعذر إكمال الطلب. حاول مرة أخرى.")
  const fields = error.fieldErrors
  const mapped: Record<string, InboxError["code"]> = {
    FORBIDDEN: "FORBIDDEN_ACTION",
    "out-of-scope": "FORBIDDEN_SCOPE",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION",
    validation: "VALIDATION",
    VERSION_CONFLICT: "CONFLICT",
    "conversation-not-mutable": "CONFLICT",
    "cursor-invalid": "CURSOR",
    "cursor-query-mismatch": "CURSOR",
    FILE_TOO_LARGE: "UNSUPPORTED_ATTACHMENT",
    UNSUPPORTED_FILE_TYPE: "UNSUPPORTED_ATTACHMENT",
    "file-required": "INVALID_ATTACHMENT",
    "file-unreadable": "INVALID_ATTACHMENT",
    "attachment-invalid": "INVALID_ATTACHMENT",
    "attachment-mismatch": "INVALID_ATTACHMENT",
    "attachment-consumed": "CONFLICT",
    "team-inactive": "INVALID_TEAM",
    "employee-inactive": "INVALID_EMPLOYEE",
    "assignment-mismatch": "INVALID_ASSIGNMENT",
    "tag-invalid": "VALIDATION",
    forbidden: "FORBIDDEN_ACTION",
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
  return new InboxError(
    code,
    error.message,
    fields,
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
    const mapped = toInboxError(error)
    if (forbiddenCode && mapped.code === "FORBIDDEN_ACTION")
      throw new InboxError(
        forbiddenCode,
        mapped.message,
        mapped.fieldErrors,
        mapped.retryable
      )
    throw mapped
  }
}

const path = (id: string) => `/inbox/${id}`

export const httpInboxService: InboxService = {
  async list(query, signal) {
    return guard(async () => {
      const page = await httpClient.getPage<ApiConversation>(
        "/inbox",
        inboxListParams(query),
        signal
      )
      return {
        items: page.items.map(toConversation),
        total: page.meta.total,
        nextCursor: page.meta.nextCursor ?? null,
      }
    }, "FORBIDDEN_SCOPE")
  },
  async detail(id, signal) {
    return guard(async () =>
      toConversation(
        await httpClient.get<ApiConversation>(path(id), undefined, signal)
      )
    )
  },
  async markRead(id) {
    return guard(async () =>
      toConversation(await httpClient.post<ApiConversation>(`${path(id)}/read`))
    )
  },
  async dashboard(query, signal) {
    return guard(
      async () =>
        toDashboard(
          await httpClient.get<InboxDashboard>(
            "/inbox/dashboard",
            inboxListParams(query),
            signal
          )
        ),
      "FORBIDDEN_SCOPE"
    )
  },
  async lookups(signal) {
    return guard(
      async () =>
        toLookups(
          await httpClient.get<ApiLookups>("/inbox/lookups", undefined, signal)
        ),
      "FORBIDDEN_SCOPE"
    )
  },
  async stageAttachment(file, signal) {
    return guard(async () => {
      const form = new FormData()
      form.append("file", file, file.name)
      return toAttachment(
        await httpClient.postForm<ApiAttachment>(
          "/inbox/attachments",
          form,
          signal
        )
      )
    })
  },
  async sendReply(command) {
    return guard(async () =>
      toConversation(
        await httpClient.post<ApiConversation>(
          `${path(command.conversationId)}/replies`,
          {
            body: command.body,
            attachments: command.attachments.map(
              ({ id, kind, fileName, sizeBytes, durationSeconds }) => ({
                id,
                kind,
                fileName,
                sizeBytes,
                ...(durationSeconds === undefined ? {} : { durationSeconds }),
              })
            ),
            retryToken: command.retryToken,
          }
        )
      )
    )
  },
  async assign(command) {
    return guard(async () =>
      toConversation(
        await httpClient.post<ApiConversation>(
          `${path(command.conversationId)}/assignment`,
          {
            employeeId: command.employeeId,
            teamId: command.teamId,
          }
        )
      )
    )
  },
  async changeStatus(id, status) {
    return guard(async () =>
      toConversation(
        await httpClient.post<ApiConversation>(`${path(id)}/status`, { status })
      )
    )
  },
  async toggleTag(id, tagId) {
    return guard(async () =>
      toConversation(
        await httpClient.post<ApiConversation>(
          `${path(id)}/tags/${tagId}/toggle`
        )
      )
    )
  },
  async archive(id) {
    return guard(async () =>
      toConversation(
        await httpClient.post<ApiConversation>(`${path(id)}/archive`)
      )
    )
  },
  async restore(id) {
    return guard(async () =>
      toConversation(
        await httpClient.post<ApiConversation>(`${path(id)}/restore`)
      )
    )
  },
  async delete(id) {
    return guard(() => httpClient.delete<void>(path(id)))
  },
  async addNote(id, content) {
    return guard(async () =>
      toInternalNote(
        await httpClient.post<Parameters<typeof toInternalNote>[0]>(
          `${path(id)}/notes`,
          { content }
        )
      )
    )
  },
  async editNote(id, noteId: NoteId, content) {
    return guard(async () =>
      toInternalNote(
        await httpClient.patch<Parameters<typeof toInternalNote>[0]>(
          `${path(id)}/notes/${noteId}`,
          { content }
        )
      )
    )
  },
  async deleteNote(id, noteId) {
    return guard(() => httpClient.delete<void>(`${path(id)}/notes/${noteId}`))
  },
  setActor() {},
  reset() {},
}
