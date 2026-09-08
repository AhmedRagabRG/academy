import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { inboxPermissions } from "./inbox-permissions"

export const inboxNavigation: NavigationItem = {
  id: "inbox",
  title: "صندوق الوارد",
  titleKey: "nav.inbox",
  iconKey: "inbox",
  route: "/inbox",
  permissionKey: inboxPermissions.viewAssigned as PermissionKey,
}
