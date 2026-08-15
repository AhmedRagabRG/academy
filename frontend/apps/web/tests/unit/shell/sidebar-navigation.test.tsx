import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SidebarNavigation } from "@/shared/components/layout/sidebar-navigation"
import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"

const pathname = vi.hoisted(() => ({ current: "/dashboard" }))
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

const items: readonly NavigationItem[] = [
  {
    id: "dashboard",
    title: "الرئيسية",
    titleKey: "nav.dashboard",
    iconKey: "dashboard",
    route: "/dashboard",
    permissionKey: "dashboard.view" as PermissionKey,
  },
  {
    id: "settings",
    title: "المؤسسة والإعدادات",
    titleKey: "nav.settings",
    iconKey: "settings",
    children: [
      { id: "overview", title: "نظرة عامة", titleKey: "s.o", iconKey: "settings", route: "/settings" },
      { id: "branches", title: "الفروع", titleKey: "s.b", iconKey: "branches", route: "/settings/branches" },
    ],
  },
]

afterEach(() => {
  cleanup()
  pathname.current = "/dashboard"
})

describe("sidebar navigation groups", () => {
  it("renders a group as a disclosure button, collapsed by default", () => {
    render(<SidebarNavigation items={items} />)
    const trigger = screen.getByRole("button", { name: /المؤسسة والإعدادات/ })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    // `hidden` keeps collapsed children out of the accessibility tree entirely.
    expect(screen.queryByRole("link", { name: "الفروع" })).not.toBeInTheDocument()
  })

  it("expands and collapses on click", async () => {
    const user = userEvent.setup()
    render(<SidebarNavigation items={items} />)
    const trigger = screen.getByRole("button", { name: /المؤسسة والإعدادات/ })

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: "الفروع" })).toBeVisible()

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("link", { name: "الفروع" })).not.toBeInTheDocument()
  })

  it("is expanded on load when the current route is inside the group", () => {
    pathname.current = "/settings/branches"
    render(<SidebarNavigation items={items} />)
    expect(
      screen.getByRole("button", { name: /المؤسسة والإعدادات/ })
    ).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: "الفروع" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("controls the panel it owns", () => {
    render(<SidebarNavigation items={items} />)
    const trigger = screen.getByRole("button", { name: /المؤسسة والإعدادات/ })
    const panelId = trigger.getAttribute("aria-controls")
    expect(panelId).toBeTruthy()
    expect(document.getElementById(panelId!)).toBeTruthy()
  })

  it("keeps top-level items as plain links", () => {
    render(<SidebarNavigation items={items} />)
    expect(screen.getByRole("link", { name: "الرئيسية" })).toHaveAttribute(
      "href",
      "/dashboard"
    )
  })

  it("hides child links and the disclosure when the sidebar is collapsed", () => {
    render(<SidebarNavigation items={items} collapsed />)
    expect(
      screen.queryByRole("button", { name: /المؤسسة والإعدادات/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "الفروع" })).not.toBeInTheDocument()
  })
})
