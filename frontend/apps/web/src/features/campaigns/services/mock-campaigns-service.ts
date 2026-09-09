import {
  seededAudienceGroups,
  seededCampaigns,
  seededRecipients,
  seededTemplates,
} from "../data/campaign-fixtures"
import { CampaignsError } from "./campaigns-error"
import type { CampaignsService } from "./campaigns-service"
import type {
  AudienceGroup,
  Campaign,
  CampaignDetail,
  CampaignDraft,
  CampaignEvent,
} from "../types/domain"

const wait = () => new Promise((resolve) => setTimeout(resolve, 120))
const clone = <T>(value: T): T => structuredClone(value)
const now = () => new Date().toISOString()

let campaigns = clone(seededCampaigns)
let groups = clone(seededAudienceGroups)
let templates = clone(seededTemplates)
const events = new Map<string, CampaignEvent[]>()

function event(campaignId: string, kind: string, label: string) {
  events.set(campaignId, [
    {
      id: `event-${crypto.randomUUID()}`,
      kind,
      label,
      actorName: "أحمد محمد",
      occurredAt: now(),
    },
    ...(events.get(campaignId) ?? []),
  ])
}

function getCampaign(id: string): Campaign {
  const campaign = campaigns.find((item) => item.id === id)
  if (!campaign)
    throw new CampaignsError("NOT_FOUND", "لم تعد هذه الحملة موجودة.")
  return campaign
}

function detail(campaign: Campaign): CampaignDetail {
  return { ...clone(campaign), events: clone(events.get(campaign.id) ?? []) }
}

function fromDraft(
  id: string,
  draft: CampaignDraft,
  current?: Campaign
): Campaign {
  const template = templates.find((item) => item.id === draft.templateId)
  if (!template)
    throw new CampaignsError("TEMPLATE_INVALID", "اختر قالب واتساب صالحًا.")
  const instant = now()
  return {
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    status: current?.status ?? "draft",
    template: clone(template),
    groupIds: [...draft.groupIds],
    variables: clone(draft.variables),
    headerVariables: clone(draft.headerVariables),
    throttlePerMinute: draft.throttlePerMinute,
    scheduledAt: draft.scheduledAt,
    stats: current?.stats ?? {
      total: 0,
      pending: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      skipped: 0,
      uncertain: 0,
    },
    createdByName: current?.createdByName ?? "أحمد محمد",
    version: (current?.version ?? 0) + 1,
    createdAt: current?.createdAt ?? instant,
    updatedAt: instant,
  }
}

export const mockCampaignsService: CampaignsService = {
  async list(query) {
    await wait()
    const needle = query.search.trim().toLocaleLowerCase("ar")
    const filtered = campaigns.filter(
      (campaign) =>
        (query.status === "all" || campaign.status === query.status) &&
        (!needle ||
          campaign.name.toLocaleLowerCase("ar").includes(needle) ||
          campaign.template.name.toLocaleLowerCase("en").includes(needle))
    )
    const offset = Number(query.cursor ?? 0)
    const items = filtered.slice(offset, offset + query.limit)
    return {
      items: clone(items),
      total: filtered.length,
      nextCursor:
        offset + items.length < filtered.length
          ? String(offset + items.length)
          : null,
    }
  },

  async detail(id) {
    await wait()
    return detail(getCampaign(id))
  },

  async lookups() {
    await wait()
    return {
      templates: clone(
        templates.filter((template) => template.status === "approved")
      ),
      groups: clone(groups),
      customFields: [
        { id: "field-program", label: "البرنامج المهتم به", type: "text" },
      ],
      contactTokens: ["name", "phone", "email", "company", "role", "ownerName"],
      channel: {
        linked: true,
        accountId: "whatsapp-demo",
        businessAccountId: "waba-demo",
      },
      templatesSyncedAt: templates[0]?.syncedAt,
    }
  },

  async templates() {
    await wait()
    return clone(templates)
  },

  async syncTemplates() {
    await wait()
    const syncedAt = now()
    templates = templates.map((template) => ({ ...template, syncedAt }))
    return { synced: templates.length, retired: 0, syncedAt }
  },

  async create(draft) {
    await wait()
    if (
      campaigns.some((campaign) => campaign.name.trim() === draft.name.trim())
    )
      throw new CampaignsError("DUPLICATE", "يوجد اسم حملة مطابق بالفعل.")
    const campaign = fromDraft(`campaign-${crypto.randomUUID()}`, draft)
    campaigns = [campaign, ...campaigns]
    event(campaign.id, "created", "أُنشئت الحملة")
    return clone(campaign)
  },

  async update(id, draft) {
    await wait()
    const current = getCampaign(id)
    const campaign = fromDraft(id, draft, current)
    campaigns = campaigns.map((item) => (item.id === id ? campaign : item))
    event(id, "updated", "حُدثت إعدادات الحملة")
    return clone(campaign)
  },

  async remove(id) {
    await wait()
    const current = getCampaign(id)
    if (current.status === "running" || current.status === "scheduled")
      throw new CampaignsError("CONFLICT", "أوقف الحملة قبل حذفها.")
    campaigns = campaigns.filter((campaign) => campaign.id !== id)
  },

  async previewAudience(groupIds) {
    await wait()
    const selected = groups.filter((group) => groupIds.includes(group.id))
    const total = selected.reduce((sum, group) => sum + group.memberCount, 0)
    return {
      total,
      duplicates: selected.length > 1 ? 3 : 0,
      invalid: selected.length ? 1 : 0,
      sample: clone(
        seededRecipients.slice(0, 4).map((recipient) => ({
          id: recipient.id,
          name: recipient.name,
          phone: recipient.phone,
        }))
      ),
    }
  },

  async importAudience(groupName, rows) {
    await wait()
    const group: AudienceGroup = {
      id: `group-${crypto.randomUUID()}`,
      name: groupName,
      description: "مجموعة مستوردة من CSV",
      memberCount: rows.length,
    }
    groups = [...groups, group]
    return {
      group: clone(group),
      imported: rows.length,
      linked: rows.length,
      skipped: [],
    }
  },

  async preview(id) {
    await wait()
    const campaign = getCampaign(id)
    const firstName = "هدى"
    let body = campaign.template.bodyText
    campaign.variables.forEach((binding) => {
      const value =
        binding.source === "literal"
          ? binding.value
          : binding.fallback || firstName
      body = body.replace(/\{\{[^}]+\}\}/, value)
    })
    return {
      contactName: firstName,
      header: campaign.template.headerText,
      body,
      footer: campaign.template.footerText,
    }
  },

  async recipients(id, query) {
    await wait()
    getCampaign(id)
    const filtered = seededRecipients.filter(
      (recipient) =>
        (query.status === "all" || recipient.status === query.status) &&
        (!query.search ||
          recipient.name.includes(query.search) ||
          recipient.phone.includes(query.search))
    )
    return { items: clone(filtered), total: filtered.length, nextCursor: null }
  },

  async exportRecipientsCsv(id) {
    getCampaign(id)
    return [
      '"الاسم","الهاتف","الحالة"',
      ...seededRecipients.map(
        (recipient) =>
          `"${recipient.name}","${recipient.phone}","${recipient.status}"`
      ),
    ].join("\n")
  },

  async launch(id, scheduledAt) {
    await wait()
    const current = getCampaign(id)
    if (!current.groupIds.length)
      throw new CampaignsError("AUDIENCE_EMPTY", "اختر جمهور الحملة أولًا.")
    const total = current.groupIds.reduce(
      (sum, groupId) =>
        sum + (groups.find((group) => group.id === groupId)?.memberCount ?? 0),
      0
    )
    const campaign: Campaign = {
      ...current,
      status: scheduledAt ? "scheduled" : "running",
      scheduledAt,
      startedAt: scheduledAt ? undefined : now(),
      stats: { ...current.stats, total, pending: total },
      version: current.version + 1,
      updatedAt: now(),
    }
    campaigns = campaigns.map((item) => (item.id === id ? campaign : item))
    event(
      id,
      scheduledAt ? "scheduled" : "started",
      scheduledAt ? "جُدولت الحملة" : "بدأ إرسال الحملة"
    )
    return detail(campaign)
  },

  async pause(id) {
    await wait()
    const current = getCampaign(id)
    const campaign = {
      ...current,
      status: "paused" as const,
      version: current.version + 1,
      updatedAt: now(),
    }
    campaigns = campaigns.map((item) => (item.id === id ? campaign : item))
    event(id, "paused", "أُوقفت الحملة مؤقتًا")
    return detail(campaign)
  },

  async resume(id) {
    await wait()
    const current = getCampaign(id)
    const campaign = {
      ...current,
      status: "running" as const,
      version: current.version + 1,
      updatedAt: now(),
    }
    campaigns = campaigns.map((item) => (item.id === id ? campaign : item))
    event(id, "resumed", "استؤنف إرسال الحملة")
    return detail(campaign)
  },

  async cancel(id) {
    await wait()
    const current = getCampaign(id)
    const campaign = {
      ...current,
      status: "cancelled" as const,
      version: current.version + 1,
      updatedAt: now(),
    }
    campaigns = campaigns.map((item) => (item.id === id ? campaign : item))
    event(id, "cancelled", "أُلغيت الحملة")
    return detail(campaign)
  },

  async testSend(id, phone) {
    await wait()
    getCampaign(id)
    if (phone.replace(/\D/g, "").length < 6)
      throw new CampaignsError("VALIDATION", "أدخل رقمًا دوليًا صالحًا.")
    return { providerMessageId: `wamid.mock-${crypto.randomUUID()}` }
  },
}
