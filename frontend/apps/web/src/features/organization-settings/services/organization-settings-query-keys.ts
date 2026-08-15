import type { ListQuery } from "../types/common"

export const organizationSettingsKeys = {
  all: ["organization-settings"] as const,
  profile: () => ["organization-settings", "profile"] as const,
  settings: () => ["organization-settings", "general"] as const,
  lookups: () => ["organization-settings", "lookups"] as const,
  list: (kind: string, query: ListQuery) => ["organization-settings", kind, "list", query] as const,
  detail: (kind: string, id: string) => ["organization-settings", kind, "detail", id] as const,
  permissionCatalog: () => ["organization-settings", "permissions", "catalog"] as const,
  rolePermissions: (roleId: string) => ["organization-settings", "permissions", "role", roleId] as const,
  effectivePermissions: (userId: string) => ["organization-settings", "permissions", "user", userId] as const,
}
