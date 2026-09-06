import type {
  Contact,
  ContactGroup,
  ContactNote,
  ContactSource,
  CustomFieldDefinition,
  CustomFieldType,
} from "../types/domain"

export interface ApiContactNote {
  id: string
  authorName: string
  content: string
  createdAt: string
  updatedAt?: string
}

export interface ApiContact {
  id: string
  name: string
  phone: string
  secondaryPhone?: string
  email?: string
  company?: string
  role?: string
  source: string
  channelHandle?: string
  ownerName: string
  ownerAccountId?: string
  groupIds: string[]
  createdAt: string
  lastActivityAt: string
  version: number
  customValues: Record<string, string>
  notes: ApiContactNote[]
}

export interface ApiContactsLookups {
  groups: { id: string; name: string; description: string }[]
  customFields: { id: string; label: string; type: string }[]
  owners: { id: string; label: string }[]
}

const SOURCES: readonly ContactSource[] = [
  "whatsapp",
  "instagram",
  "facebook",
  "website",
  "phone",
  "manual",
  "import",
]
const FIELD_TYPES: readonly CustomFieldType[] = ["text", "number", "date"]

const toSource = (value: string): ContactSource =>
  SOURCES.includes(value as ContactSource) ? (value as ContactSource) : "manual"

const toFieldType = (value: string): CustomFieldType =>
  FIELD_TYPES.includes(value as CustomFieldType)
    ? (value as CustomFieldType)
    : "text"

const toNote = (note: ApiContactNote): ContactNote => ({
  id: note.id,
  authorName: note.authorName,
  content: note.content,
  createdAt: note.createdAt,
})

export function toContact(row: ApiContact): Contact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    secondaryPhone: row.secondaryPhone,
    email: row.email,
    company: row.company,
    role: row.role,
    source: toSource(row.source),
    channelHandle: row.channelHandle,
    ownerName: row.ownerName,
    ownerAccountId: row.ownerAccountId,
    version: row.version,
    groupIds: row.groupIds ?? [],
    createdAt: row.createdAt,
    lastActivityAt: row.lastActivityAt,
    customValues: row.customValues ?? {},
    notes: (row.notes ?? []).map(toNote),
  }
}

export function toLookups(payload: ApiContactsLookups) {
  return {
    groups: payload.groups.map((group): ContactGroup => ({
      id: group.id,
      name: group.name,
      description: group.description,
    })),
    customFields: payload.customFields.map((field): CustomFieldDefinition => ({
      id: field.id,
      label: field.label,
      type: toFieldType(field.type),
    })),
    owners: payload.owners,
  }
}
