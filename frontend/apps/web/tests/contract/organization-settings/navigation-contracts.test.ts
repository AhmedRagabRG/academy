import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { organizationSettingsNavigation } from "@/features/organization-settings/config/navigation"

const children = organizationSettingsNavigation.children ?? []
const APP_DIR = join(process.cwd(), "src/app/(workspace)")

/**
 * The settings navigation, asserted as an invariant rather than a frozen list.
 *
 * A hard-coded list of routes only records what the menu happened to contain
 * the day it was written, and goes red on every legitimate addition or
 * removal. What actually matters is that each entry leads somewhere real and
 * is gated on a view permission — a menu item pointing at a deleted page is a
 * 404 the user finds before any test does.
 */
describe("settings navigation contract", () => {
  it("lists the core administrative destinations", () =>
    expect(children.length).toBeGreaterThanOrEqual(4))

  it("scopes every destination under /settings", () => {
    for (const item of children) expect(item.route).toMatch(/^\/settings\//)
  })

  it("has no duplicate destinations", () => {
    const routes = children.map((item) => item.route)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it("gates every destination on a view permission", () =>
    expect(children.every((item) => item.permissionKey?.endsWith(".view"))).toBe(
      true
    ))

  it("points every destination at a page that exists", () => {
    for (const item of children)
      expect(
        existsSync(join(APP_DIR, `${item.route}/page.tsx`)),
        `${item.route} has no page.tsx`
      ).toBe(true)
  })
})
