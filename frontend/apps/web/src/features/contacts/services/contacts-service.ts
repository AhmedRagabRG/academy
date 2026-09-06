import type {
  Contact,
  ContactDraft,
  ContactGroup,
  ContactSource,
  CustomFieldDefinition,
  CustomFieldType,
} from "../types/domain"

export interface ContactsListQuery {
  search: string
  source: ContactSource | "all"
  groupIds: string[]
  cursor?: string | null
  limit: number
}

export interface ContactsPage {
  items: Contact[]
  total: number
  nextCursor: string | null
}

export interface ContactsLookups {
  groups: ContactGroup[]
  customFields: CustomFieldDefinition[]
  owners: { id: string; label: string }[]
}

export interface ImportOutcome {
  imported: number
  skipped: { phone: string; reason: string }[]
}

export interface ContactsService {
  list(query: ContactsListQuery, signal?: AbortSignal): Promise<ContactsPage>
  lookups(signal?: AbortSignal): Promise<ContactsLookups>
  create(draft: ContactDraft): Promise<Contact>
  update(
    id: string,
    draft: ContactDraft,
    expectedVersion?: number
  ): Promise<Contact>
  remove(id: string): Promise<void>
  importContacts(rows: ContactDraft[]): Promise<ImportOutcome>
  exportCsv(query: ContactsListQuery): Promise<string>
  addNote(id: string, content: string): Promise<Contact>
  toggleGroup(id: string, groupId: string): Promise<Contact>
  setCustomValue(id: string, fieldId: string, value: string): Promise<Contact>
  createGroup(name: string, description: string): Promise<ContactGroup>
  createCustomField(
    label: string,
    type: CustomFieldType
  ): Promise<CustomFieldDefinition>
  reset(): void
}
