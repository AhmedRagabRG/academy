import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"

export const ticketsNavigation: NavigationItem = {
  id: "tickets",
  title: "التذاكر",
  titleKey: "nav.tickets",
  iconKey: "tickets",
  route: "/tickets",
  permissionKey: "tickets.view.assigned" as PermissionKey,
}
