import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"

const permission = (value: string) => value as PermissionKey

export const organizationSettingsNavigation: NavigationItem = {
  id: "settings",
  title: "المؤسسة والإعدادات",
  titleKey: "nav.settings",
  iconKey: "settings",
  permissionKey: permission("settings.view"),
  children: [
    { id: "settings-users", title: "المستخدمون", titleKey: "nav.settings.users", iconKey: "users", route: "/settings/users", permissionKey: permission("settings.users.view") },
    { id: "settings-roles", title: "الأدوار", titleKey: "nav.settings.roles", iconKey: "roles", route: "/settings/roles", permissionKey: permission("settings.roles.view") },
    { id: "settings-permissions", title: "الصلاحيات", titleKey: "nav.settings.permissions", iconKey: "permissions", route: "/settings/permissions", permissionKey: permission("settings.permissions.view") },
    { id: "settings-general", title: "الإعدادات العامة", titleKey: "nav.settings.general", iconKey: "general", route: "/settings/general", permissionKey: permission("settings.general.view") },
  ],
}
