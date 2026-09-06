import type { InternalUser, Role } from "../types/domain"
const audit = { organizationId: "org-1", version: 1, createdAt: "2026-01-01T08:00:00.000Z", updatedAt: "2026-07-31T08:00:00.000Z", createdBy: "system", updatedBy: "admin-1" }
export const roles: Role[] = [
  { ...audit, id: "role-admin" as Role["id"], name: "مدير المؤسسة", code: "org-admin", description: "إدارة إعدادات المؤسسة والوصول", permissionIds: ["settings.view", "settings.organization.view", "settings.roles.view", "settings.roles.update", "settings.permissions.view", "settings.permissions.update"], status: "active" },
  { ...audit, id: "role-staff" as Role["id"], name: "موظف إداري", code: "staff", description: "إدارة العمليات اليومية", permissionIds: ["dashboard.view", "settings.view", "settings.users.view"], status: "active" },
]
export const users: InternalUser[] = [
  { ...audit, id: "user-1" as InternalUser["id"], fullName: "أحمد محمود", email: "admin@alsalam.academy", phone: "+201000000001", roleIds: ["role-admin"], status: "active" },
  { ...audit, id: "user-2" as InternalUser["id"], fullName: "سارة علي", email: "sara@alsalam.academy", phone: "+201000000002", roleIds: ["role-staff"], status: "active" },
]
