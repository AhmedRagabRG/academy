"use client"

import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { foundationNavigation } from "@/shared/config/foundation-navigation"
import { filterNavigation } from "@/shared/utils/navigation"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import { useSidebarStore } from "@/shared/store/sidebar-store"
import { SidebarNavigation } from "./sidebar-navigation"
import { cn } from "@workspace/ui/lib/utils"
import { BrandLogo } from "@/shared/components/brand/brand-logo"

export function Sidebar() {
  const context = useEmployeeContextStore((state) => state.context)
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggle = useSidebarStore((state) => state.toggle)
  const items = filterNavigation(
    foundationNavigation,
    new Set(context?.role.permissionKeys ?? [])
  )
  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 overflow-hidden border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] lg:flex lg:flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-20 shrink-0 items-center justify-center border-b border-sidebar-border px-4",
          collapsed && "h-16 px-2"
        )}
      >
        {collapsed ? (
          <BrandLogo priority variant="mark" className="size-9" />
        ) : (
          <BrandLogo priority className="max-h-14 w-40 brightness-0 invert" />
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <SidebarNavigation items={items} collapsed={collapsed} />
      </div>
      <button
        type="button"
        onClick={toggle}
        className="m-3 flex h-10 shrink-0 items-center justify-center rounded-lg text-white/75 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label={collapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
      >
        {collapsed ? (
          <ChevronsLeft className="size-5" />
        ) : (
          <ChevronsRight className="size-5" />
        )}
      </button>
    </aside>
  )
}
