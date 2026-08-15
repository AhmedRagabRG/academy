import type { EntityStatus } from '../../../../prisma/generated/client';
import type { FileDescriptor } from '../../../shared/types/file-descriptor';

export interface OrganizationAuditFields {
  version: number;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface OrganizationRecordPermissions {
  view: boolean;
  update: boolean;
  changeStatus?: boolean;
}

export interface PublicBranch extends OrganizationAuditFields {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  managerId: string | null;
  workingHours: string;
  status: Lowercase<EntityStatus>;
  permissions: OrganizationRecordPermissions;
}

export interface PublicDepartment extends OrganizationAuditFields {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string;
  status: Lowercase<EntityStatus>;
  permissions: OrganizationRecordPermissions;
}

export interface PublicAcademicYear extends OrganizationAuditFields {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status: Lowercase<EntityStatus>;
  permissions: OrganizationRecordPermissions;
}

export interface PublicAcademicTerm extends OrganizationAuditFields {
  id: string;
  organizationId: string;
  academicYearId: string;
  academicYearName: string;
  name: string;
  startDate: string;
  endDate: string;
  order: number;
  status: Lowercase<EntityStatus>;
  permissions: OrganizationRecordPermissions;
}

export type OrganizationAsset = FileDescriptor;

export interface MasterDataOption {
  id: string;
  code: string;
  label: string;
  active: boolean;
  disabledReason?: string;
}

export interface PublicLookupGroup extends OrganizationAuditFields {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  parentGroupId: string | null;
  status: Lowercase<EntityStatus>;
  valueCount?: number;
  childGroupCount?: number;
  permissions: OrganizationRecordPermissions;
}

export interface PublicLookupValue extends OrganizationAuditFields {
  id: string;
  lookupGroupId: string;
  groupCode: string;
  parentValueId: string | null;
  name: string;
  code: string;
  /** Optional prose. Expense categories carry one; most groups leave it null. */
  description: string | null;
  sortOrder: number;
  status: Lowercase<EntityStatus>;
  permissions: OrganizationRecordPermissions;
}

export interface PublicOrganizationProfile extends OrganizationAuditFields {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  logo: OrganizationAsset | null;
  favicon: OrganizationAsset | null;
  cover: OrganizationAsset | null;
  website: string | null;
  address: string | null;
  workingHours: Record<string, string>;
  contacts: Array<{
    id: string;
    type: string;
    label: string;
    value: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  socialLinks: Array<{
    id: string;
    platform: string;
    url: string;
    sortOrder: number;
  }>;
}
