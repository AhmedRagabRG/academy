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

export interface Branch extends BaseEntity {
  name: string
  code: string
  address: string
  phone: string
  /** Required by the API on create; every branch is reachable by email. */
  email: string
  managerId?: string
  workingHours: string
  status: EntityStatus
}

export interface Department extends BaseEntity {
  name: string
  code: string
  description: string
  status: EntityStatus
}

export interface AcademicYear extends BaseEntity {
  name: string
  code: string
  startDate: string
  endDate: string
  status: EntityStatus
}

export interface AcademicTerm extends BaseEntity {
  academicYearId: string
  academicYearName: string
  name: string
  startDate: string
  endDate: string
  /** Position within the academic year; the API orders terms by it. */
  order: number
  status: EntityStatus
}

export interface InternalUser extends BaseEntity {
  fullName: string
  email: string
  phone: string
  profileImage?: FileAsset
  branchId: string
  branchName: string
  departmentId: string
  departmentName: string
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
  defaultBranchId: string
  defaultAcademicYearId: string
}

export type AdministrativeEntity = Branch | Department | AcademicYear | AcademicTerm | InternalUser | Role
