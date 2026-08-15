import { describe, expect, it } from "vitest"
import { filterNavigation, findActiveItem } from "@/shared/utils/navigation"
import { foundationNavigation } from "@/shared/config/foundation-navigation"
import type { PermissionKey } from "@/shared/types/foundation"

describe("navigation contracts", () => {
  it("filters unavailable destinations", () => {
    const items = filterNavigation(foundationNavigation, new Set(["dashboard.view" as PermissionKey]))
    expect(items.map((item) => item.id)).toEqual(["dashboard"])
  })
  it("derives the active item", () =>
    expect(findActiveItem(foundationNavigation, "/dashboard")?.id).toBe("dashboard"))
  it("derives the active item inside a group", () =>
    expect(findActiveItem(foundationNavigation, "/settings/branches")?.id).toBe(
      "settings-branches"
    ))
})
