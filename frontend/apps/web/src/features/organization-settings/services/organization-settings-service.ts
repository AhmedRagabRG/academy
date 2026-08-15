import type { ListQuery, LookupOption, PaginatedResult } from "../types/common"
import type { AcademicTerm, AcademicYear, Branch, Department, GeneralSettings, InternalUser, OrganizationProfile, PermissionGroup, Role } from "../types/domain"

export interface OrganizationLookups {
  languages: LookupOption[]
  timeZones: LookupOption[]
  currencies: LookupOption[]
  countries: LookupOption[]
  dateFormats: LookupOption[]
  numberFormats: LookupOption[]
  weekdays: LookupOption[]
}

export type EntityKind = "branches" | "departments" | "academic-years" | "academic-terms" | "users" | "roles"
export type EntityByKind = {
  branches: Branch
  departments: Department
  "academic-years": AcademicYear
  "academic-terms": AcademicTerm
  users: InternalUser
  roles: Role
}

export interface OrganizationSettingsService {
  /** Read-only: the profile is code-owned configuration and has no write. */
  getProfile(): Promise<OrganizationProfile>
  getGeneralSettings(): Promise<GeneralSettings>
  updateGeneralSettings(input: Partial<GeneralSettings> & { expectedVersion: number }): Promise<GeneralSettings>
  getLookups(): Promise<OrganizationLookups>
  list<K extends EntityKind>(kind: K, query: ListQuery): Promise<PaginatedResult<EntityByKind[K]>>
  get<K extends EntityKind>(kind: K, id: string): Promise<EntityByKind[K]>
  create<K extends EntityKind>(kind: K, input: Omit<EntityByKind[K], "id" | "organizationId" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">): Promise<EntityByKind[K]>
  update<K extends EntityKind>(kind: K, id: string, input: Partial<EntityByKind[K]> & { expectedVersion: number }): Promise<EntityByKind[K]>
  changeStatus<K extends EntityKind>(kind: K, id: string, status: EntityByKind[K]["status"], expectedVersion: number): Promise<EntityByKind[K]>
  activateAcademicYear(id: string, expectedVersion: number): Promise<AcademicYear>
  getPermissionCatalog(): Promise<PermissionGroup[]>
  replaceRolePermissions(roleId: string, permissionIds: string[], expectedVersion: number): Promise<Role>
  getEffectivePermissions(userId: string): Promise<string[]>
}
