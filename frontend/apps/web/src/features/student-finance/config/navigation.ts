import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { financePermissions } from "./finance-permissions"

export const studentFinanceNavigation: NavigationItem = {
  id: "student-finance",
  title: "الشؤون المالية للطلاب",
  titleKey: "nav.studentFinance",
  iconKey: "finance",
  route: "/student-finance",
  permissionKey: financePermissions.view as PermissionKey,
}
