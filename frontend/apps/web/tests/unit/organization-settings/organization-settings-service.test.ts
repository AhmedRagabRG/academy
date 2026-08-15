import { beforeEach, describe, expect, it } from "vitest"
import { mockOrganizationSettingsService as service } from "@/features/organization-settings/services/mock-organization-settings-service"
import { mockScenarioController } from "@/features/organization-settings/services/mock-scenario-controller"
import { ORGANIZATION_PROFILE } from "@/features/organization-settings/config/organization-profile"

/**
 * The organization profile is code-owned configuration. These guard the *absence*
 * of a write, so a future contributor cannot quietly reintroduce a panel editor
 * for an organization-wide identity that has no second instance to compare
 * against.
 */
describe("organization profile service", () => {
  beforeEach(() => {
    service.reset()
    mockScenarioController.setLatency(0)
  })

  it("reads the profile configured in code", async () => {
    const profile = await service.getProfile()
    expect(profile.nameAr).toBe(ORGANIZATION_PROFILE.nameAr)
    expect(profile.website).toBe(ORGANIZATION_PROFILE.website)
    expect(profile.currency).toBe(ORGANIZATION_PROFILE.currency)
  })

  it("exposes no write for the profile", () => {
    const surface = Object.keys(service)
    expect(surface).toContain("getProfile")
    expect(
      surface.filter((name) => /^(update|set|patch|save).*profile/i.test(name))
    ).toEqual([])
  })

  it("keeps general settings writable — only the profile is fixed", async () => {
    const current = await service.getGeneralSettings()
    const next = await service.updateGeneralSettings({
      timeZone: "Asia/Riyadh",
      expectedVersion: current.version,
    })
    expect(next.timeZone).toBe("Asia/Riyadh")
    expect(next.version).toBe(current.version + 1)
  })

  it("rejects a stale general-settings write", async () => {
    const current = await service.getGeneralSettings()
    await service.updateGeneralSettings({
      timeZone: "Asia/Riyadh",
      expectedVersion: current.version,
    })
    await expect(
      service.updateGeneralSettings({
        timeZone: "Africa/Cairo",
        expectedVersion: current.version,
      })
    ).rejects.toMatchObject({ kind: "version-conflict" })
  })
})
