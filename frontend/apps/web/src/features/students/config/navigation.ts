import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { studentsPermissions } from "./students-permissions"

export const studentsNavigation: NavigationItem = {
  id: "students",
  title: "الطلاب",
  titleKey: "nav.students",
  iconKey: "students",
  route: "/students",
  permissionKey: studentsPermissions.view as PermissionKey,
}
