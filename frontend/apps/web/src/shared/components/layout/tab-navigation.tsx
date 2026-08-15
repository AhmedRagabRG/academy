"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@workspace/ui/lib/utils"

export interface TabNavigationItem {
  href: string
  label: string
  /** Set when the item should only match its exact path (typically the root tab). */
  exact?: boolean
}

/**
 * Route-segment tabs.
 *
 * Implemented as a landmark `nav` of links with `aria-current="page"` rather than
 * an ARIA `tablist`. Each item is a real URL that navigates and code-splits, so
 * link semantics are what assistive technology should announce; `role="tab"` would
 * strip the link affordance and imply a `tabpanel` relationship that does not
 * exist across a route change. All items stay in the tab order, matching every
 * other navigation in the app.
 */
export function TabNavigation({
  items,
  ariaLabel,
}: {
  items: readonly TabNavigationItem[]
  ariaLabel: string
}) {
  const pathname = usePathname()

  const isActive = (item: TabNavigationItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  if (items.length === 0) return null

  return (
    <nav aria-label={ariaLabel} className="border-border border-b">
      <ul className="-mb-px flex flex-wrap gap-1">
        {items.map((item) => {
          const active = isActive(item)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
                  active
                    ? "border-brand-gold text-brand-navy dark:text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
