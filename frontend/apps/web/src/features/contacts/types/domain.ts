export type ContactSource =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "website"
  | "phone"
  | "manual"
  | "import"

export type CustomFieldType = "text" | "number" | "date"

export interface ContactNote {
  id: string
  authorName: string
  content: string
  createdAt: string
}

export interface Contact {
  id: string
  name: string
  phone: string
  secondaryPhone?: string
  email?: string
  company?: string
  role?: string
  source: ContactSource
  channelHandle?: string
  ownerName: string
  ownerAccountId?: string
  groupIds: string[]
  createdAt: string
  lastActivityAt: string
  customValues: Record<string, string>
  notes: ContactNote[]
  /** Server-owned fields; absent while a record is only a local draft. */
  version?: number
}

export interface ContactGroup {
  id: string
  name: string
  description: string
}

export interface CustomFieldDefinition {
  id: string
  label: string
  type: CustomFieldType
}

export interface ContactDraft {
  name: string
  phone: string
  email: string
  company: string
  role: string
  secondaryPhone?: string
  ownerAccountId?: string
}
