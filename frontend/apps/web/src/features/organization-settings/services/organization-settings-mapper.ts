import type { EntityId, EntityStatus, PaginatedResult } from "../types/common"
import type {
  GeneralSettings,
  InternalUser,
  OrganizationProfile,
  Permission,
  PermissionGroup,
  Role,
} from "../types/domain"
import type { Page } from "@/shared/api"

/**
 * Translation between the API's records and this module's domain types.
 *
 * The two disagree in small, consistent ways — the API omits audit columns on
 * some records, names an employee `displayName` where the UI calls it
 * `fullName`. Isolating those conversions here keeps the service body about
 * requests and the domain types free of transport concerns.
 */

/** Audit fields the API leaves off some records but `BaseEntity` requires. */
interface AuditSource {
  organizationId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

const EPOCH = "1970-01-01T00:00:00.000Z"

const audit = (source: AuditSource) => ({
  organizationId: source.organizationId ?? "",
  createdAt: source.createdAt ?? EPOCH,
  updatedAt: source.updatedAt ?? source.createdAt ?? EPOCH,
  createdBy: source.createdBy ?? "",
  updatedBy: source.updatedBy ?? source.createdBy ?? "",
})

/** The API answers with lowercase status names; anything else is inactive. */
export function toStatus(value: string | null | undefined): EntityStatus {
  const normalized = value?.toLowerCase()
  return normalized === "active" || normalized === "archived"
    ? normalized
    : "inactive"
}

export interface ApiEmployee extends AuditSource {
  id: string
  email: string
  displayName: string
  phone: string | null
  position: string | null
  organizationWide: boolean
  avatar: { id: string; fileName: string; mimeType: string; size: number; url: string } | null
  status: string
  version: number
  roleIds: string[]
}

/**
 * An employee as the settings UI models it.
 */
export const toInternalUser = (row: ApiEmployee): InternalUser => ({
  ...audit(row),
  id: row.id as EntityId,
  fullName: row.displayName,
  email: row.email,
  phone: row.phone ?? "",
  profileImage: row.avatar
    ? {
        id: row.avatar.id,
        fileName: row.avatar.fileName,
        mimeType: row.avatar.mimeType as "image/jpeg" | "image/png" | "image/webp",
        size: row.avatar.size,
        url: row.avatar.url,
      }
    : undefined,
  roleIds: row.roleIds,
  status: toStatus(row.status),
  version: row.version,
})

export interface ApiRole extends AuditSource {
  id: string
  code: string
  displayName: string
  description: string | null
  permissionIds: string[]
  status: string
  version: number
}

export const toRole = (row: ApiRole): Role => ({
  ...audit(row),
  id: row.id as EntityId,
  name: row.displayName,
  code: row.code,
  description: row.description ?? "",
  permissionIds: row.permissionIds ?? [],
  status: toStatus(row.status),
  version: row.version,
})

export interface ApiGeneralSettings extends AuditSource {
  defaultLanguage: string
  timeZone: string
  currency: string
  dateFormat: string
  numberFormat: string
  workingDays: string[]
  version: number
}

export const toGeneralSettings = (
  row: ApiGeneralSettings
): GeneralSettings => ({
  createdAt: row.createdAt ?? EPOCH,
  updatedAt: row.updatedAt ?? row.createdAt ?? EPOCH,
  createdBy: row.createdBy ?? "",
  updatedBy: row.updatedBy ?? "",
  version: row.version,
  defaultLanguage: row.defaultLanguage,
  timeZone: row.timeZone,
  currency: row.currency,
  dateFormat: row.dateFormat,
  numberFormat: row.numberFormat,
  workingDays: row.workingDays,
})

interface ApiAsset {
  id: string
  fileName: string
  mimeType: string
  size: number
  url: string
}

export interface ApiOrganizationProfile extends AuditSource {
  id: string
  name: string
  code: string
  logo: ApiAsset | null
  cover: ApiAsset | null
  website: string | null
  address: string | null
  contacts: Array<{
    id: string
    type: string
    label: string
    value: string
    isPrimary: boolean
  }>
  version: number
}

const toAsset = (asset: ApiAsset | null) =>
  asset
    ? {
        id: asset.id,
        fileName: asset.fileName,
        mimeType: asset.mimeType as "image/jpeg" | "image/png" | "image/webp",
        size: asset.size,
        url: asset.url,
      }
    : undefined

/**
 * The organization profile, filled out from general settings.
 *
 * The profile record carries identity and contact details; locale fields
 * (time zone, currency, languages) live in general settings, and the UI reads
 * them off one object. The caller passes the settings it already fetched.
 */
export const toOrganizationProfile = (
  row: ApiOrganizationProfile,
  settings?: Pick<GeneralSettings, "timeZone" | "currency" | "defaultLanguage">
): OrganizationProfile => ({
  ...audit(row),
  id: row.id as EntityId,
  version: row.version,
  name: row.name,
  nameAr: row.name,
  nameEn: row.code,
  description: "",
  logo: toAsset(row.logo),
  cover: toAsset(row.cover),
  contacts: (row.contacts ?? []).map((contact) => ({
    id: contact.id,
    type: contact.type.toLowerCase() === "phone" ? "phone" : "email",
    label: contact.label,
    value: contact.value,
    isPrimary: contact.isPrimary,
  })),
  website: row.website ?? "",
  address: row.address ?? "",
  country: "",
  city: "",
  timeZone: settings?.timeZone ?? "",
  currency: settings?.currency ?? "",
  languages: settings?.defaultLanguage ? [settings.defaultLanguage] : [],
  defaultLanguage: settings?.defaultLanguage ?? "",
})

export interface ApiPermissionGroup {
  moduleKey: string
  permissions: Array<{
    id: string
    key: string
    moduleKey: string
    actionKey: string
    label: string
    description: string | null
  }>
}

export const toPermissionGroup = (
  group: ApiPermissionGroup
): PermissionGroup => ({
  key: group.moduleKey,
  label: group.moduleKey,
  permissions: group.permissions.map(
    (permission): Permission => ({
      id: permission.id,
      key: permission.key,
      moduleKey: permission.moduleKey,
      actionKey: permission.actionKey,
      label: permission.label,
      description: permission.description ?? "",
    })
  ),
})

/** Reshapes the API's `meta` envelope into the module's paginated result. */
export const toPaginated = <Row, Mapped>(
  page: Page<Row>,
  map: (row: Row) => Mapped
): PaginatedResult<Mapped> => ({
  items: page.items.map(map),
  total: page.meta.total,
  page: page.meta.page,
  pageSize: page.meta.limit,
  totalPages: page.meta.totalPages,
})
