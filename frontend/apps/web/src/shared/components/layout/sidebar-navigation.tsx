"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { iconRegistry } from "@/shared/config/icon-registry"
import type { NavigationItem } from "@/shared/config/navigation"
import { cn } from "@workspace/ui/lib/utils"

const isExactRouteActive = (pathname: string, route?: string) =>
  Boolean(route) && pathname === route

const isChildActive = (pathname: string, route?: string) =>
  Boolean(route) &&
  (pathname === route ||
    (route !== "/settings" && pathname.startsWith(`${route}/`)))

function NavigationGroup({ item, collapsed, onNavigate }: { item: NavigationItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const panelId = useId()
  const Icon = iconRegistry[item.iconKey]
  const childLinks = item.route
    ? [{ ...item, id: `${item.id}-home`, children: undefined }, ...(item.children ?? [])]
    : (item.children ?? [])
  const parentActive = item.route ? isExactRouteActive(pathname, item.route) : false
  const groupActive =
    parentActive ||
    (item.children?.some((child) => isChildActive(pathname, child.route)) ?? false)
  // `undefined` means "follow the route"; an explicit toggle overrides it. This
  // keeps the group open when navigation lands inside it without syncing state
  // from an effect, which would cause a cascading render.
  const [toggled, setToggled] = useState<boolean | undefined>(undefined)
  const open = toggled ?? groupActive

  if (collapsed) return <div className="pt-1"><div className="flex h-9 items-center justify-center text-xs font-medium text-white/50" title={item.title}><Icon className="size-4 shrink-0" /></div>{groupActive && <span className="sr-only">القسم النشط</span>}</div>

  return <div className="pt-1">
    <button type="button" onClick={() => setToggled(!open)} aria-expanded={open} aria-controls={panelId} className={cn("focus-visible:ring-sidebar-ring hover:bg-sidebar-accent flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium text-white/50 transition-colors focus-visible:ring-2", groupActive && "text-white/75")}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 text-start">{item.title}</span>
      <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", !open && "-rotate-90 rtl:rotate-90")} aria-hidden />
    </button>
    <div id={panelId} hidden={!open} className="ms-3 space-y-0.5 border-s border-white/10 ps-2">
      {childLinks.map((child) => {
        const ChildIcon = iconRegistry[child.iconKey]
        const active =
          child.id === `${item.id}-home`
            ? isExactRouteActive(pathname, child.route)
            : isChildActive(pathname, child.route)
        return <Link key={child.id} href={child.route!} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("focus-visible:ring-sidebar-ring relative flex min-h-8 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/70 focus-visible:ring-2", active ? "bg-sidebar-primary text-white after:absolute after:inset-y-1.5 after:start-0 after:w-0.5 after:bg-brand-gold" : "hover:bg-sidebar-accent hover:text-white")}><ChildIcon className="size-3.5" />{child.title}</Link>
      })}
    </div>
  </div>
}

export function SidebarNavigation({ items, collapsed = false, onNavigate }: { items: readonly NavigationItem[]; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  return <nav aria-label="التنقل الرئيسي" className="space-y-0.5">{items.map((item) => {
    if (item.children?.length) return <NavigationGroup key={item.id} item={item} collapsed={collapsed} onNavigate={onNavigate} />
    if (!item.route) return null
    const Icon = iconRegistry[item.iconKey]
    const active = pathname === item.route
    return <Link key={item.id} href={item.route} onClick={onNavigate} aria-current={active ? "page" : undefined} title={collapsed ? item.title : undefined} className={cn("focus-visible:ring-sidebar-ring relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium text-white/75 transition-colors focus-visible:ring-2", active ? "bg-sidebar-primary text-sidebar-primary-foreground after:absolute after:inset-y-1.5 after:start-0 after:w-0.5 after:rounded-full after:bg-brand-gold" : "hover:bg-sidebar-accent hover:text-white", collapsed && "justify-center px-0")}><Icon className="size-4 shrink-0" aria-hidden />{!collapsed && <span>{item.title}</span>}</Link>
  })}</nav>
}
