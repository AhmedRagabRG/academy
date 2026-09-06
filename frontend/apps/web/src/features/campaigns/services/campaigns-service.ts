import type {
  AudiencePreview,
  AudienceRow,
  Campaign,
  CampaignDetail,
  CampaignDraft,
  CampaignLookups,
  CampaignPreview,
  CampaignRecipient,
  CampaignStatus,
  ImportAudienceOutcome,
  RecipientStatus,
  TemplateSyncOutcome,
  WhatsappTemplate,
} from "../types/domain"

export interface CampaignsListQuery {
  search: string
  status: CampaignStatus | "all"
  cursor?: string | null
  limit: number
}

export interface CampaignsPage {
  items: Campaign[]
  total: number
  nextCursor: string | null
}

export interface RecipientsQuery {
  search: string
  status: RecipientStatus | "all"
  cursor?: string | null
  limit: number
}

export interface RecipientsPage {
  items: CampaignRecipient[]
  total: number
  nextCursor: string | null
}

export interface CampaignsService {
  list(query: CampaignsListQuery, signal?: AbortSignal): Promise<CampaignsPage>
  detail(id: string, signal?: AbortSignal): Promise<CampaignDetail>
  lookups(signal?: AbortSignal): Promise<CampaignLookups>
  templates(signal?: AbortSignal): Promise<WhatsappTemplate[]>
  syncTemplates(): Promise<TemplateSyncOutcome>
  create(draft: CampaignDraft): Promise<Campaign>
  update(
    id: string,
    draft: CampaignDraft,
    expectedVersion?: number
  ): Promise<Campaign>
  remove(id: string): Promise<void>
  previewAudience(
    groupIds: string[],
    signal?: AbortSignal
  ): Promise<AudiencePreview>
  importAudience(
    groupName: string,
    rows: AudienceRow[]
  ): Promise<ImportAudienceOutcome>
  preview(id: string, signal?: AbortSignal): Promise<CampaignPreview>
  recipients(
    id: string,
    query: RecipientsQuery,
    signal?: AbortSignal
  ): Promise<RecipientsPage>
  exportRecipientsCsv(id: string): Promise<string>
  launch(id: string, scheduledAt?: string): Promise<CampaignDetail>
  pause(id: string): Promise<CampaignDetail>
  resume(id: string): Promise<CampaignDetail>
  cancel(id: string): Promise<CampaignDetail>
  testSend(id: string, phone: string): Promise<{ providerMessageId: string }>
}
