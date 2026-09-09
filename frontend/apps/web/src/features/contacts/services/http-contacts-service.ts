import { ApiError, httpClient, type QueryValue } from "@/shared/api"
import { ContactsError } from "./contacts-error"
import {
  toContact,
  toLookups,
  type ApiContact,
  type ApiContactsLookups,
} from "./contacts-mapper"
import type {
  ContactsListQuery,
  ContactsService,
  ImportOutcome,
} from "./contacts-service"
import type { ContactDraft, CustomFieldType } from "../types/domain"

const listParams = (query: ContactsListQuery): Record<string, QueryValue> => ({
  search: query.search,
  source: query.source === "all" ? undefined : query.source,
  groupIds: query.groupIds,
  cursor: query.cursor ?? undefined,
  limit: query.limit,
})

export function toContactsError(error: unknown): ContactsError {
  if (!(error instanceof ApiError))
    return new ContactsError("UNEXPECTED", "تعذر إكمال الطلب. حاول مرة أخرى.")
  const fields = error.fieldErrors
  const mapped: Record<string, ContactsError["code"]> = {
    FORBIDDEN: "FORBIDDEN_ACTION",
    "out-of-scope": "FORBIDDEN_SCOPE",
    forbidden: "FORBIDDEN_ACTION",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION",
    validation: "VALIDATION",
    DUPLICATE_VALUE: "DUPLICATE",
    VERSION_CONFLICT: "CONFLICT",
    "contact-has-open-leads": "IN_USE",
    "phone-invalid": "VALIDATION",
    "field-value-invalid": "VALIDATION",
    "field-invalid": "VALIDATION",
    "group-invalid": "VALIDATION",
    "owner-invalid": "VALIDATION",
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
            : error.status === 0 || error.status >= 500
              ? "UNAVAILABLE"
              : "UNEXPECTED")
  return new ContactsError(
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
    const mapped = toContactsError(error)
    if (forbiddenCode && mapped.code === "FORBIDDEN_ACTION")
      throw new ContactsError(
        forbiddenCode,
        mapped.message,
        mapped.fieldErrors,
        mapped.retryable
      )
    throw mapped
  }
}

/** The API takes the empty string for a cleared optional field. */
const draftBody = (draft: ContactDraft) => ({
  name: draft.name.trim(),
  phone: draft.phone.trim(),
  email: draft.email.trim(),
  company: draft.company.trim(),
  role: draft.role.trim(),
  secondaryPhone: draft.secondaryPhone?.trim() ?? "",
  ownerAccountId: draft.ownerAccountId || undefined,
})

export const httpContactsService: ContactsService = {
  async list(query, signal) {
    return guard(async () => {
      const page = await httpClient.getPage<ApiContact>(
        "/contacts",
        listParams(query),
        signal
      )
      return {
        items: page.items.map(toContact),
        total: page.meta.total,
        nextCursor: page.meta.nextCursor ?? null,
      }
    }, "FORBIDDEN_SCOPE")
  },

  async lookups(signal) {
    return guard(
      async () =>
        toLookups(
          await httpClient.get<ApiContactsLookups>(
            "/contacts/lookups",
            undefined,
            signal
          )
        ),
      "FORBIDDEN_SCOPE"
    )
  },

  async create(draft) {
    return guard(async () =>
      toContact(
        await httpClient.post<ApiContact>("/contacts", draftBody(draft))
      )
    )
  },

  async update(id, draft, expectedVersion) {
    return guard(async () =>
      toContact(
        await httpClient.patch<ApiContact>(`/contacts/${id}`, {
          ...draftBody(draft),
          expectedVersion,
        })
      )
    )
  },

  async remove(id) {
    return guard(async () => {
      await httpClient.delete<void>(`/contacts/${id}`)
    })
  },

  async importContacts(rows) {
    return guard(async () =>
      httpClient.post<ImportOutcome>("/contacts/import", {
        rows: rows.map(draftBody),
      })
    )
  },

  async exportCsv(query) {
    return guard(async () =>
      httpClient.getText("/contacts/export", {
        search: query.search,
        source: query.source === "all" ? undefined : query.source,
        groupIds: query.groupIds,
      })
    )
  },

  async addNote(id, content) {
    return guard(async () =>
      toContact(
        await httpClient.post<ApiContact>(`/contacts/${id}/notes`, { content })
      )
    )
  },

  async toggleGroup(id, groupId) {
    return guard(async () =>
      toContact(
        await httpClient.post<ApiContact>(
          `/contacts/${id}/groups/${groupId}/toggle`
        )
      )
    )
  },

  async setCustomValue(id, fieldId, value) {
    return guard(async () =>
      toContact(
        await httpClient.put<ApiContact>(`/contacts/${id}/fields/${fieldId}`, {
          value,
        })
      )
    )
  },

  async createGroup(name, description) {
    return guard(async () => {
      const group = await httpClient.post<{
        id: string
        name: string
        description: string
      }>("/contacts/groups", { name, description })
      return { id: group.id, name: group.name, description: group.description }
    })
  },

  async deleteGroup(groupId) {
    return guard(async () => {
      await httpClient.delete<void>(`/contacts/groups/${groupId}`)
    })
  },

  async createCustomField(label, type: CustomFieldType) {
    return guard(async () => {
      const field = await httpClient.post<{
        id: string
        label: string
        type: string
      }>("/contacts/fields", { label, type })
      return { id: field.id, label: field.label, type }
    })
  },

  /** Server-owned data; the caller refetches instead. */
  reset() {},
}
