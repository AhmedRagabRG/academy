import type {
  AudiencePreview,
  Campaign,
  CampaignDetail,
  CampaignLookups,
  CampaignRecipient,
  CampaignStats,
  VariableBinding,
  WhatsappTemplate,
} from "../types/domain"

export type ApiTemplate = WhatsappTemplate & {
  variableTokens?: string[]
  headerVariableTokens?: string[]
}
export type ApiCampaign = Omit<Campaign, "template" | "stats"> & {
  template: ApiTemplate
  stats: Partial<CampaignStats>
}
export type ApiCampaignDetail = ApiCampaign & CampaignDetail
export type ApiLookups = Omit<CampaignLookups, "templates"> & {
  templates: ApiTemplate[]
}

const emptyStats: CampaignStats = {
  total: 0,
  pending: 0,
  sending: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
  skipped: 0,
}

export const toTemplate = (template: ApiTemplate): WhatsappTemplate => ({
  ...template,
  variableTokens: template.variableTokens ?? [],
  headerVariableTokens: template.headerVariableTokens ?? [],
})

const toBindings = (bindings: VariableBinding[] = []): VariableBinding[] =>
  bindings.map((binding) => ({
    position: binding.position,
    source: binding.source,
    value: binding.value ?? "",
    fallback: binding.fallback ?? "",
  }))

export const toCampaign = (campaign: ApiCampaign): Campaign => ({
  ...campaign,
  template: toTemplate(campaign.template),
  groupIds: campaign.groupIds ?? [],
  variables: toBindings(campaign.variables),
  headerVariables: toBindings(campaign.headerVariables),
  stats: { ...emptyStats, ...campaign.stats },
})

export const toCampaignDetail = (
  campaign: ApiCampaignDetail
): CampaignDetail => ({
  ...toCampaign(campaign),
  events: campaign.events ?? [],
})

export const toLookups = (lookups: ApiLookups): CampaignLookups => ({
  ...lookups,
  templates: (lookups.templates ?? []).map(toTemplate),
  groups: lookups.groups ?? [],
  customFields: lookups.customFields ?? [],
  contactTokens: lookups.contactTokens ?? [],
  channel: lookups.channel ?? { linked: false },
})

export const toRecipient = (recipient: CampaignRecipient): CampaignRecipient =>
  recipient

export const toAudiencePreview = (
  preview: Partial<AudiencePreview>
): AudiencePreview => ({
  total: preview.total ?? 0,
  duplicates: preview.duplicates ?? 0,
  invalid: preview.invalid ?? 0,
  sample: preview.sample ?? [],
})
