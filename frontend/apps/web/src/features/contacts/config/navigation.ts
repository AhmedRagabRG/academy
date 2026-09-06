import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { contactsPermissions } from "./contacts-permissions"

export const contactsNavigation: NavigationItem = {
  id: "contacts",
  title: "جهات الاتصال",
  titleKey: "nav.contacts",
  iconKey: "contacts",
  route: "/contacts",
  permissionKey: contactsPermissions.view as PermissionKey,
}
