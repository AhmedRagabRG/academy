import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { accountingPermissions } from "./accounting-permissions"

const permission = (key: string) => key as PermissionKey

export const accountingNavigation: NavigationItem = {
  id: "accounting",
  title: "المحاسبة",
  titleKey: "nav.accounting",
  iconKey: "accounting",
  route: "/accounting",
  permissionKey: permission(accountingPermissions.view),
  children: [
    {
      id: "accounting-requests",
      title: "طلبات المصروفات",
      titleKey: "nav.accounting.requests",
      iconKey: "accounting",
      route: "/accounting/expense-requests",
      permissionKey: permission(accountingPermissions.requestsView),
    },
    {
      id: "accounting-categories",
      title: "تصنيفات المصروفات",
      titleKey: "nav.accounting.categories",
      iconKey: "categories",
      route: "/accounting/expense-categories",
      permissionKey: permission(accountingPermissions.categoriesView),
    },
    {
      id: "accounting-sub-categories",
      title: "التصنيفات الفرعية",
      titleKey: "nav.accounting.subCategories",
      iconKey: "categories",
      route: "/accounting/expense-sub-categories",
      permissionKey: permission(accountingPermissions.categoriesView),
    },
  ],
}
