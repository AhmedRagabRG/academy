import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"

export function filterNavigation(items: readonly NavigationItem[], permissions: ReadonlySet<PermissionKey>): NavigationItem[] {
  return items.flatMap((item) => {
    const children = item.children ? filterNavigation(item.children, permissions) : undefined
    const permitted = !item.permissionKey || permissions.has(item.permissionKey)
    if (!permitted || (!item.route && children?.length === 0)) return []
    return [{ ...item, children }]
  })
}

export function findActiveItem(items: readonly NavigationItem[], pathname: string): NavigationItem | undefined {
  for (const item of items) {
    if (item.route === pathname) return item
    const child = item.children && findActiveItem(item.children, pathname)
    if (child) return child
  }
}
