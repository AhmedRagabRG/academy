import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { campaignsPermissions } from "./campaigns-permissions"

export const campaignsNavigation: NavigationItem = {
  id: "campaigns",
  title: "الحملات",
  titleKey: "nav.campaigns",
  iconKey: "campaigns",
  route: "/campaigns",
  permissionKey: campaignsPermissions.view as PermissionKey,
}
