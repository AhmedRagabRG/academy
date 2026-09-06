import type { AuditMetadata, BaseEntity, ContactPoint, EntityStatus, FileAsset } from "./common"

export interface OrganizationProfile extends BaseEntity {
  name: string
  nameAr: string
  nameEn: string
  description: string
  logo?: FileAsset
  cover?: FileAsset
  contacts: ContactPoint[]
  website: string
  address: string
  country: string
  city: string
  timeZone: string
  currency: string
  languages: string[]
  defaultLanguage: string
}

export interface InternalUser extends BaseEntity {
  fullName: string
  email: string
  phone: string
  profileImage?: FileAsset
  roleIds: string[]
  status: EntityStatus
}

export interface Role extends BaseEntity {
  name: string
  /** Stable machine key; the API requires it on create and never changes it. */
  code: string
  description: string
  permissionIds: string[]
  status: EntityStatus
}

export interface Permission {
  id: string
  key: string
  moduleKey: string
  actionKey: string
  label: string
  description: string
}

export interface PermissionGroup {
  key: string
  label: string
  permissions: Permission[]
}

export interface GeneralSettings extends AuditMetadata {
  version: number
  defaultLanguage: string
  timeZone: string
  currency: string
  dateFormat: string
  numberFormat: string
  workingDays: string[]
}

export type AdministrativeEntity = InternalUser | Role
