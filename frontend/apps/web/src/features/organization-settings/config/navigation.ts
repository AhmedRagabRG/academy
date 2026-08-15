import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
const permission = (value: string) => value as PermissionKey
export const organizationSettingsNavigation: NavigationItem = { id: "settings", title: "المؤسسة والإعدادات", titleKey: "nav.settings", iconKey: "settings", permissionKey: permission("settings.view"), children: [
  { id: "settings-branches", title: "الفروع", titleKey: "nav.settings.branches", iconKey: "branches", route: "/settings/branches", permissionKey: permission("settings.branches.view") },
  { id: "settings-departments", title: "الأقسام", titleKey: "nav.settings.departments", iconKey: "departments", route: "/settings/departments", permissionKey: permission("settings.departments.view") },
  { id: "settings-academic-years", title: "الأعوام الأكاديمية", titleKey: "nav.settings.academicYears", iconKey: "academicYears", route: "/settings/academic-years", permissionKey: permission("settings.academicYears.view") },
  { id: "settings-academic-terms", title: "الفصول الأكاديمية", titleKey: "nav.settings.academicTerms", iconKey: "academicTerms", route: "/settings/academic-terms", permissionKey: permission("settings.academicTerms.view") },
  { id: "settings-users", title: "المستخدمون", titleKey: "nav.settings.users", iconKey: "users", route: "/settings/users", permissionKey: permission("settings.users.view") },
  { id: "settings-roles", title: "الأدوار", titleKey: "nav.settings.roles", iconKey: "roles", route: "/settings/roles", permissionKey: permission("settings.roles.view") },
  { id: "settings-permissions", title: "الصلاحيات", titleKey: "nav.settings.permissions", iconKey: "permissions", route: "/settings/permissions", permissionKey: permission("settings.permissions.view") },
  { id: "settings-document-requirements", title: "المستندات المطلوبة", titleKey: "nav.settings.documentRequirements", iconKey: "general", route: "/settings/document-requirements", permissionKey: permission("settings.documentRequirements.view") },
  { id: "settings-general", title: "الإعدادات العامة", titleKey: "nav.settings.general", iconKey: "general", route: "/settings/general", permissionKey: permission("settings.general.view") },
] }
