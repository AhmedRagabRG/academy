import { describe, expect, it } from "vitest"
import { mockCampaignsService } from "@/features/campaigns/services/mock-campaigns-service"

describe("WhatsApp campaign service", () => {
  it("creates, previews, launches, pauses, and resumes a grouped campaign", async () => {
    const lookups = await mockCampaignsService.lookups()
    const template = lookups.templates[0]
    const group = lookups.groups[0]
    expect(template).toBeDefined()
    expect(group).toBeDefined()

    const campaign = await mockCampaignsService.create({
      name: `اختبار حملة ${Date.now()}`,
      description: "تحقق آلي من دورة الحملة",
      templateId: template!.id,
      groupIds: [group!.id],
      variables: template!.variableTokens.map((_token, index) => ({
        position: index + 1,
        source: "literal",
        value: `قيمة ${index + 1}`,
        fallback: "",
      })),
      headerVariables: template!.headerVariableTokens.map((_token, index) => ({
        position: index + 1,
        source: "literal",
        value: `ترويسة ${index + 1}`,
        fallback: "",
      })),
      throttlePerMinute: 120,
    })

    const audience = await mockCampaignsService.previewAudience([group!.id])
    expect(audience.total).toBe(group!.memberCount)
    expect((await mockCampaignsService.preview(campaign.id)).body).toContain(
      "قيمة"
    )

    const running = await mockCampaignsService.launch(campaign.id)
    expect(running.status).toBe("running")
    expect(running.stats.total).toBe(group!.memberCount)
    expect((await mockCampaignsService.pause(campaign.id)).status).toBe(
      "paused"
    )
    expect((await mockCampaignsService.resume(campaign.id)).status).toBe(
      "running"
    )
  })
})
