import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"

export const admissionsNavigation: NavigationItem = {
  id: "admissions",
  title: "القبول والتسجيل",
  titleKey: "nav.admissions",
  iconKey: "admissions",
  route: "/admissions",
  permissionKey: "admissions.view" as PermissionKey,
}
