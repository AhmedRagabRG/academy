import { describe, expect, it } from "vitest"
import { foundationNavigation } from "@/shared/config/foundation-navigation"

describe("application shell contract", () => {
  it("opens on the dashboard", () => {
    expect(foundationNavigation[0]?.route).toBe("/dashboard")
  })

  it("registers the settings group and every business module", () => {
    expect(foundationNavigation.map((item) => item.id)).toEqual([
      "dashboard",
      "inbox",
      "tickets",
      "settings",
      "academic-catalog",
      "admissions",
      "students",
      "student-finance",
      "accounting",
    ])
  })

  it("groups the settings destinations", () => {
    const settings = foundationNavigation.find((item) => item.id === "settings")
    // Counted rather than listed: the exact set moves as settings screens are
    // added and removed, and the grouping is what this asserts.
    expect(settings?.children?.length).toBeGreaterThan(0)
    expect(
      settings?.children?.every((child) => child.route?.startsWith("/settings/"))
    ).toBe(true)
  })

  it("registers no component showcase", () => {
    // The UI library route was removed; nothing in the shell may point at it.
    expect(
      foundationNavigation.some((item) => item.route === "/foundation")
    ).toBe(false)
  })
})
