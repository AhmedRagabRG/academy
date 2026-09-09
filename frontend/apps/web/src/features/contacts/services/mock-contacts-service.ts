import {
  seededContactGroups,
  seededContacts,
  seededCustomFields,
} from "../data/contact-fixtures"
import type {
  Contact,
  ContactDraft,
  ContactGroup,
  CustomFieldDefinition,
  CustomFieldType,
} from "../types/domain"
import { ContactsError } from "./contacts-error"
import type {
  ContactsListQuery,
  ContactsService,
  ImportOutcome,
} from "./contacts-service"

const clone = <T>(value: T): T => structuredClone(value)
const normalize = (value: string) => value.trim().toLocaleLowerCase("ar")
const digits = (value: string) => value.replace(/\D/g, "")

interface MockState {
  contacts: Contact[]
  groups: ContactGroup[]
  customFields: CustomFieldDefinition[]
}

const seed = (): MockState => ({
  contacts: clone(seededContacts),
  groups: clone(seededContactGroups),
  customFields: clone(seededCustomFields),
})

let state: MockState = seed()

const mockOwners = [
  { id: "agent-ahmed", label: "أحمد محمد" },
  { id: "agent-sara", label: "سارة إبراهيم" },
]

const ownerName = (id?: string) =>
  mockOwners.find((owner) => owner.id === id)?.label ?? "أحمد محمد"

const find = (id: string): Contact => {
  const contact = state.contacts.find((item) => item.id === id)
  if (!contact) throw new ContactsError("NOT_FOUND", "جهة الاتصال غير موجودة")
  return contact
}

const findGroup = (id: string): ContactGroup => {
  const group = state.groups.find((item) => item.id === id)
  if (!group) throw new ContactsError("NOT_FOUND", "المجموعة غير موجودة")
  return group
}

const touch = (id: string, apply: (contact: Contact) => Contact): Contact => {
  const next = apply(find(id))
  state.contacts = state.contacts.map((item) => (item.id === id ? next : item))
  return clone(next)
}

const fromDraft = (
  draft: ContactDraft,
  source: Contact["source"]
): Contact => ({
  id: `contact-${crypto.randomUUID()}`,
  name: draft.name.trim(),
  phone: draft.phone.trim(),
  secondaryPhone: draft.secondaryPhone?.trim() || undefined,
  email: draft.email.trim() || undefined,
  company: draft.company.trim() || undefined,
  role: draft.role.trim() || undefined,
  source,
  ownerAccountId: draft.ownerAccountId ?? "agent-ahmed",
  ownerName: ownerName(draft.ownerAccountId),
  groupIds: [],
  createdAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  version: 1,
  customValues: {},
  notes: [],
})

const matches = (contact: Contact, query: ContactsListQuery) => {
  if (query.source !== "all" && contact.source !== query.source) return false
  if (
    query.groupIds.length &&
    !query.groupIds.some((id) => contact.groupIds.includes(id))
  )
    return false
  const needle = normalize(query.search)
  if (!needle) return true
  const haystack = [
    contact.name,
    contact.phone,
    contact.email,
    contact.company,
    contact.channelHandle,
  ]
    .filter(Boolean)
    .join(" ")
  return (
    normalize(haystack).includes(needle) ||
    (digits(query.search).length > 0 &&
      digits(contact.phone).includes(digits(query.search)))
  )
}

const escapeCsv = (value?: string) => `"${(value ?? "").replaceAll('"', '""')}"`

/**
 * A synchronous read of the current mock state, for the inbox mock adapter to
 * reproduce the CRM link the API returns on a conversation.
 */
export const findMockContactByName = (name: string): Contact | null =>
  state.contacts.find((contact) => contact.name === name) ?? null

/**
 * The in-memory contacts backend.
 *
 * It mirrors the API's rules — duplicate phone numbers are refused, a contact
 * with an open lead cannot be deleted — so the journeys that drive conflict and
 * refusal states do not need a live database.
 */
export const mockContactsService: ContactsService = {
  list(query) {
    const filtered = state.contacts.filter((contact) => matches(contact, query))
    const start = query.cursor ? Number(query.cursor) : 0
    const page = filtered.slice(start, start + query.limit)
    const next = start + query.limit
    return Promise.resolve({
      items: clone(page),
      total: filtered.length,
      nextCursor: next < filtered.length ? String(next) : null,
    })
  },

  lookups() {
    return Promise.resolve({
      groups: clone(state.groups),
      customFields: clone(state.customFields),
      owners: clone(mockOwners),
    })
  },

  create(draft) {
    if (
      state.contacts.some(
        (contact) => digits(contact.phone) === digits(draft.phone)
      )
    )
      return Promise.reject(
        new ContactsError("DUPLICATE", "القيمة مستخدمة بالفعل")
      )
    const contact = fromDraft(draft, "manual")
    state.contacts = [contact, ...state.contacts]
    return Promise.resolve(clone(contact))
  },

  update(id, draft, expectedVersion) {
    const current = find(id)
    if (expectedVersion && current.version !== expectedVersion)
      return Promise.reject(
        new ContactsError("CONFLICT", "عُدلت جهة الاتصال من مستخدم آخر")
      )
    return Promise.resolve(
      touch(id, (contact) => ({
        ...contact,
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        secondaryPhone: draft.secondaryPhone?.trim() || undefined,
        email: draft.email.trim() || undefined,
        company: draft.company.trim() || undefined,
        role: draft.role.trim() || undefined,
        ownerAccountId: draft.ownerAccountId ?? contact.ownerAccountId,
        ownerName: draft.ownerAccountId
          ? ownerName(draft.ownerAccountId)
          : contact.ownerName,
        version: (contact.version ?? 1) + 1,
      }))
    )
  },

  remove(id) {
    find(id)
    state.contacts = state.contacts.filter((contact) => contact.id !== id)
    return Promise.resolve()
  },

  importContacts(rows) {
    const skipped: ImportOutcome["skipped"] = []
    const seen = new Set(state.contacts.map((contact) => digits(contact.phone)))
    const imported: Contact[] = []
    for (const row of rows) {
      const phone = digits(row.phone)
      if (!row.name.trim() || !phone) {
        skipped.push({ phone: row.phone, reason: "invalid" })
        continue
      }
      if (seen.has(phone)) {
        skipped.push({ phone: row.phone, reason: "already-exists" })
        continue
      }
      seen.add(phone)
      imported.push(fromDraft(row, "import"))
    }
    state.contacts = [...imported, ...state.contacts]
    return Promise.resolve({ imported: imported.length, skipped })
  },

  exportCsv(query) {
    const rows = state.contacts.filter((contact) => matches(contact, query))
    const header = [
      "name",
      "phone",
      "secondaryPhone",
      "email",
      "company",
      "role",
      "source",
      "owner",
      "createdAt",
    ]
    return Promise.resolve(
      [
        header.join(","),
        ...rows.map((contact) =>
          [
            contact.name,
            contact.phone,
            contact.secondaryPhone,
            contact.email,
            contact.company,
            contact.role,
            contact.source,
            contact.ownerName,
            contact.createdAt,
          ]
            .map(escapeCsv)
            .join(",")
        ),
      ].join("\n")
    )
  },

  addNote(id, content) {
    return Promise.resolve(
      touch(id, (contact) => ({
        ...contact,
        notes: [
          {
            id: `note-${crypto.randomUUID()}`,
            authorName: "أحمد محمد",
            content: content.trim(),
            createdAt: new Date().toISOString(),
          },
          ...contact.notes,
        ],
      }))
    )
  },

  toggleGroup(id, groupId) {
    return Promise.resolve(
      touch(id, (contact) => ({
        ...contact,
        groupIds: contact.groupIds.includes(groupId)
          ? contact.groupIds.filter((value) => value !== groupId)
          : [...contact.groupIds, groupId],
      }))
    )
  },

  setCustomValue(id, fieldId, value) {
    return Promise.resolve(
      touch(id, (contact) => ({
        ...contact,
        customValues: { ...contact.customValues, [fieldId]: value },
      }))
    )
  },

  createGroup(name, description) {
    const group: ContactGroup = {
      id: `group-${crypto.randomUUID()}`,
      name: name.trim(),
      description: description.trim(),
    }
    state.groups = [...state.groups, group]
    return Promise.resolve(clone(group))
  },

  /** Mirrors the API deleting the group's membership rows, not the contacts. */
  deleteGroup(groupId) {
    findGroup(groupId)
    state.groups = state.groups.filter((group) => group.id !== groupId)
    state.contacts = state.contacts.map((contact) =>
      contact.groupIds.includes(groupId)
        ? {
            ...contact,
            groupIds: contact.groupIds.filter((id) => id !== groupId),
          }
        : contact
    )
    return Promise.resolve()
  },

  createCustomField(label, type: CustomFieldType) {
    const field: CustomFieldDefinition = {
      id: `field-${crypto.randomUUID()}`,
      label: label.trim(),
      type,
    }
    state.customFields = [...state.customFields, field]
    return Promise.resolve(clone(field))
  },

  reset() {
    state = seed()
  },
}
