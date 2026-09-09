export type CampaignStatus =
  "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled"

export type RecipientStatus =
  | "pending"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "skipped"
  | "uncertain"

export type TemplateStatus =
  "approved" | "pending" | "rejected" | "paused" | "disabled"

/** Where one template placeholder takes its per-recipient value from. */
export type VariableSource = "contact" | "field" | "literal"

export type ContactToken =
  "name" | "phone" | "email" | "company" | "role" | "ownerName"

export interface WhatsappTemplate {
  id: string
  name: string
  language: string
  category: string
  status: TemplateStatus
  headerKind?: string
  headerText?: string
  bodyText: string
  footerText?: string
  /** `["1","2"]` for positional templates, names for named ones. */
  variableTokens: string[]
  headerVariableTokens: string[]
  named: boolean
  qualityScore?: string
  rejectedReason?: string
  syncedAt: string
}

export interface VariableBinding {
  position: number
  source: VariableSource
  value: string
  /** Used when the bound field is empty — WhatsApp rejects blank parameters. */
  fallback: string
}

export interface CampaignStats {
  total: number
  pending: number
  sending: number
  sent: number
  delivered: number
  read: number
  failed: number
  skipped: number
  /** A send whose outcome could not be confirmed — shown, never hidden. */
  uncertain: number
}

export interface CampaignEvent {
  id: string
  kind: string
  label: string
  actorName: string
  occurredAt: string
}

export interface Campaign {
  id: string
  name: string
  description: string
  status: CampaignStatus
  template: WhatsappTemplate
  groupIds: string[]
  variables: VariableBinding[]
  headerVariables: VariableBinding[]
  throttlePerMinute: number
  scheduledAt?: string
  startedAt?: string
  completedAt?: string
  lastError?: string
  stats: CampaignStats
  createdByName: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface CampaignDetail extends Campaign {
  events: CampaignEvent[]
}

export interface CampaignRecipient {
  id: string
  contactId?: string
  name: string
  phone: string
  status: RecipientStatus
  attempts: number
  errorCode?: string
  errorMessage?: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  failedAt?: string
  uncertainAt?: string
}

export interface AudienceGroup {
  id: string
  name: string
  description: string
  memberCount: number
}

export interface CampaignLookups {
  templates: WhatsappTemplate[]
  groups: AudienceGroup[]
  customFields: { id: string; label: string; type: string }[]
  contactTokens: ContactToken[]
  channel: { linked: boolean; accountId?: string; businessAccountId?: string }
  templatesSyncedAt?: string
}

export interface CampaignDraft {
  name: string
  description: string
  templateId: string
  groupIds: string[]
  variables: VariableBinding[]
  headerVariables: VariableBinding[]
  throttlePerMinute: number
  scheduledAt?: string
}

export interface AudiencePreview {
  total: number
  duplicates: number
  invalid: number
  sample: { id: string; name: string; phone: string }[]
}

export interface AudienceRow {
  name: string
  phone: string
  email: string
  company: string
  role: string
}

export interface ImportAudienceOutcome {
  group: AudienceGroup
  imported: number
  linked: number
  skipped: { phone: string; reason: string }[]
}

export interface CampaignPreview {
  contactName?: string
  header?: string
  body: string
  footer?: string
}

export interface TemplateSyncOutcome {
  synced: number
  retired: number
  syncedAt: string
}
