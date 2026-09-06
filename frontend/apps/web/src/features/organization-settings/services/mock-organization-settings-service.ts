import { roles as roleSeed, users as userSeed } from "../data/access-fixtures"
import { generalSettings as settingsSeed, organizationProfile as profileSeed } from "../data/organization-fixtures"
import { lookups, permissionGroups } from "../data/organization-settings-fixtures"
import type { EntityId, ListQuery, PaginatedResult } from "../types/common"
import type { AdministrativeEntity, Role } from "../types/domain"
import { OrganizationSettingsError } from "./organization-settings-error"
import type { EntityByKind, EntityKind, OrganizationSettingsService } from "./organization-settings-service"
import { mockScenarioController } from "./mock-scenario-controller"

type Collections = { [K in EntityKind]: EntityByKind[K][] }
const clone = <T,>(value: T): T => structuredClone(value)
let profile = clone(profileSeed)
let settings = clone(settingsSeed)
let collections: Collections = { users: clone(userSeed), roles: clone(roleSeed) }

const now = () => new Date().toISOString()
const normalize = (value: string) => value.trim().toLocaleLowerCase("ar")
const makeId = (kind: string) => `${kind}-${crypto.randomUUID()}` as EntityId

async function prepare() {
  await mockScenarioController.wait()
  const scenario = mockScenarioController.get()
  if (scenario === "permission") throw new OrganizationSettingsError("permission-denied", "permission", "لا تملك صلاحية تنفيذ هذا الإجراء")
  if (scenario === "error") throw new OrganizationSettingsError("unexpected", "unexpected", "تعذر إكمال الطلب. حاول مرة أخرى.", undefined, true)
  if (scenario === "conflict") throw new OrganizationSettingsError("version-conflict", "version-conflict", "تم تحديث السجل في جلسة أخرى. حدّث البيانات وحاول مجددًا.")
  if (scenario === "dependency") throw new OrganizationSettingsError("dependency", "dependency", "لا يمكن تنفيذ الإجراء لوجود سجلات مرتبطة")
  if (scenario === "validation") throw new OrganizationSettingsError("validation", "validation", "تحقق من الحقول المطلوبة", { name: "هذا الحقل مطلوب" })
  return scenario
}

function paginate<T extends AdministrativeEntity>(items: T[], query: ListQuery): PaginatedResult<T> {
  const search = normalize(query.search ?? "")
  let filtered = items.filter((item) => !search || Object.values(item).some((value) => typeof value === "string" && normalize(value).includes(search)))
  if (query.status && query.status !== "all") filtered = filtered.filter((item) => item.status === query.status)
  if (query.sort) filtered.sort((a, b) => String(a[query.sort as keyof T] ?? "").localeCompare(String(b[query.sort as keyof T] ?? ""), "ar") * (query.direction === "desc" ? -1 : 1))
  const pageSize = Math.max(1, query.pageSize)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(Math.max(1, query.page), totalPages)
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, totalPages }
}

function assertVersion(record: { version: number }, expectedVersion: number) {
  if (record.version !== expectedVersion) throw new OrganizationSettingsError("version-conflict", "version-conflict", "تم تعديل السجل مسبقًا")
}

function duplicate(kind: EntityKind, record: Partial<AdministrativeEntity>, ignoreId?: string) {
  const items = collections[kind] as AdministrativeEntity[]
  if (kind === "users" && "email" in record && items.some((item) => item.id !== ignoreId && "email" in item && normalize(item.email) === normalize(String(record.email)))) return "email"
  if (kind === "roles" && "name" in record && items.some((item) => item.id !== ignoreId && "name" in item && normalize(item.name) === normalize(String(record.name)))) return "name"
}

const criticalPermission = "settings.permissions.update"
function hasAnotherAdministrator(excludedRoleId?: string, excludedUserId?: string) {
  return collections.users.some((user) => user.id !== excludedUserId && user.status === "active" && user.roleIds.some((roleId) => roleId !== excludedRoleId && collections.roles.some((role) => role.id === roleId && role.status === "active" && role.permissionIds.includes(criticalPermission))))
}

function assertAdministratorContinuity(kind: EntityKind, id: string, nextStatus?: string, nextPermissionIds?: string[]) {
  if (kind === "roles") {
    const role = collections.roles.find((item) => item.id === id)
    const removesCriticalAccess = role?.permissionIds.includes(criticalPermission) && (nextStatus !== undefined ? nextStatus !== "active" : !nextPermissionIds?.includes(criticalPermission))
    if (removesCriticalAccess && !hasAnotherAdministrator(id)) throw new OrganizationSettingsError("last-administrator", "dependency", "يجب الاحتفاظ بدور إداري نشط واحد على الأقل")
  }
  if (kind === "users") {
    const user = collections.users.find((item) => item.id === id)
    const isAdministrator = user?.roleIds.some((roleId) => collections.roles.some((role) => role.id === roleId && role.status === "active" && role.permissionIds.includes(criticalPermission)))
    if (isAdministrator && nextStatus !== "active" && !hasAnotherAdministrator(undefined, id)) throw new OrganizationSettingsError("last-administrator", "dependency", "يجب الاحتفاظ بمستخدم إداري نشط واحد على الأقل")
  }
}

export const mockOrganizationSettingsService: OrganizationSettingsService & { reset(): void } = {
  async getProfile() { await prepare(); return clone(profile) },
  async getGeneralSettings() { await prepare(); return clone(settings) },
  async updateGeneralSettings(input) { await prepare(); assertVersion(settings, input.expectedVersion); settings = { ...settings, ...input, version: settings.version + 1, updatedAt: now(), updatedBy: "admin-1" }; return clone(settings) },
  async getLookups() { await prepare(); return clone(lookups) },
  async list(kind, query) { const scenario = await prepare(); if (scenario === "empty") return { items: [], total: 0, page: 1, pageSize: query.pageSize, totalPages: 1 } as PaginatedResult<EntityByKind[typeof kind]>; return clone(paginate(collections[kind] as AdministrativeEntity[], query)) as PaginatedResult<EntityByKind[typeof kind]> },
  async get(kind, id) { await prepare(); const record = collections[kind].find((item) => item.id === id); if (!record) throw new OrganizationSettingsError("not-found", "not-found", "السجل غير موجود"); return clone(record) as EntityByKind[typeof kind] },
  async create(kind, input) { await prepare(); const duplicateField = duplicate(kind, input as Partial<AdministrativeEntity>); if (duplicateField) throw new OrganizationSettingsError("duplicate", "duplicate", "القيمة مستخدمة مسبقًا", { [duplicateField]: "القيمة مستخدمة مسبقًا" }); const timestamp = now(); const record = { ...input, id: makeId(kind), organizationId: "org-1" as EntityId, version: 1, createdAt: timestamp, updatedAt: timestamp, createdBy: "admin-1", updatedBy: "admin-1" } as unknown as EntityByKind[typeof kind]; (collections[kind] as EntityByKind[typeof kind][]).push(record); return clone(record) },
  async update(kind, id, input) { await prepare(); const index = collections[kind].findIndex((item) => item.id === id); if (index < 0) throw new OrganizationSettingsError("not-found", "not-found", "السجل غير موجود"); const current = collections[kind][index] as EntityByKind[typeof kind]; assertVersion(current, input.expectedVersion); const duplicateField = duplicate(kind, input as Partial<AdministrativeEntity>, id); if (duplicateField) throw new OrganizationSettingsError("duplicate", "duplicate", "القيمة مستخدمة مسبقًا", { [duplicateField]: "القيمة مستخدمة مسبقًا" }); const next = { ...current, ...input, id: current.id, version: current.version + 1, updatedAt: now(), updatedBy: "admin-1" }; (collections[kind] as EntityByKind[typeof kind][])[index] = next; return clone(next) },
  async changeStatus(kind, id, status, expectedVersion) { await prepare(); const index = collections[kind].findIndex((item) => item.id === id); if (index < 0) throw new OrganizationSettingsError("not-found", "not-found", "السجل غير موجود"); const current = collections[kind][index] as EntityByKind[typeof kind]; assertVersion(current, expectedVersion); assertAdministratorContinuity(kind, id, status); const next = { ...current, status, version: current.version + 1, updatedAt: now(), updatedBy: "admin-1" }; (collections[kind] as EntityByKind[typeof kind][])[index] = next; return clone(next) },
  async getPermissionCatalog() { await prepare(); return clone(permissionGroups) },
  async replaceRolePermissions(roleId, permissionIds, expectedVersion) { await prepare(); const index = collections.roles.findIndex((role) => role.id === roleId); if (index < 0) throw new OrganizationSettingsError("not-found", "not-found", "الدور غير موجود"); const current = collections.roles[index]!; assertVersion(current, expectedVersion); assertAdministratorContinuity("roles", roleId, undefined, permissionIds); const next: Role = { ...current, permissionIds: [...new Set(permissionIds)], version: current.version + 1, updatedAt: now() }; collections.roles[index] = next; return clone(next) },
  async getEffectivePermissions(userId) { await prepare(); const user = collections.users.find((item) => item.id === userId); if (!user || user.status !== "active") return []; return [...new Set(collections.roles.filter((role) => role.status === "active" && user.roleIds.includes(role.id)).flatMap((role) => role.permissionIds))] },
  reset() { profile = clone(profileSeed); settings = clone(settingsSeed); collections = { users: clone(userSeed), roles: clone(roleSeed) }; mockScenarioController.reset() },
}
