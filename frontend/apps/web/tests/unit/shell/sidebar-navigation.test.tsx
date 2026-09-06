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
      { id: "users", title: "المستخدمين", titleKey: "s.u", iconKey: "users", route: "/settings/users" },
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
    expect(screen.queryByRole("link", { name: "المستخدمين" })).not.toBeInTheDocument()
  })

  it("expands and collapses on click", async () => {
    const user = userEvent.setup()
    render(<SidebarNavigation items={items} />)
    const trigger = screen.getByRole("button", { name: /المؤسسة والإعدادات/ })

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: "المستخدمين" })).toBeVisible()

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("link", { name: "المستخدمين" })).not.toBeInTheDocument()
  })

  it("is expanded on load when the current route is inside the group", () => {
    pathname.current = "/settings/users"
    render(<SidebarNavigation items={items} />)
    expect(
      screen.getByRole("button", { name: /المؤسسة والإعدادات/ })
    ).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: "المستخدمين" })).toHaveAttribute(
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
    expect(screen.queryByRole("link", { name: "المستخدمين" })).not.toBeInTheDocument()
  })

  it("renders a parent route as the first nested link when the group has one", async () => {
    const groupedItems: readonly NavigationItem[] = [
      {
        id: "inbox",
        title: "صندوق الوارد",
        titleKey: "nav.inbox",
        iconKey: "inbox",
        route: "/inbox",
        children: [
          {
            id: "inbox-channels",
            title: "قنوات الوارد",
            titleKey: "nav.inbox.channels",
            iconKey: "inbox",
            route: "/inbox/channels",
          },
        ],
      },
    ]
    const user = userEvent.setup()
    render(<SidebarNavigation items={groupedItems} />)

    await user.click(screen.getByRole("button", { name: /صندوق الوارد/ }))

    expect(screen.getByRole("link", { name: "صندوق الوارد" })).toHaveAttribute(
      "href",
      "/inbox"
    )
    expect(screen.getByRole("link", { name: "قنوات الوارد" })).toHaveAttribute(
      "href",
      "/inbox/channels"
    )
  })

  it("highlights only the exact parent route, not sibling child routes", async () => {
    pathname.current = "/inbox/channels"
    const groupedItems: readonly NavigationItem[] = [
      {
        id: "inbox",
        title: "صندوق الوارد",
        titleKey: "nav.inbox",
        iconKey: "inbox",
        route: "/inbox",
        children: [
          {
            id: "inbox-channels",
            title: "قنوات الوارد",
            titleKey: "nav.inbox.channels",
            iconKey: "inbox",
            route: "/inbox/channels",
          },
        ],
      },
    ]
    render(<SidebarNavigation items={groupedItems} />)

    expect(screen.getByRole("link", { name: "صندوق الوارد" })).not.toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByRole("link", { name: "قنوات الوارد" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })
})
