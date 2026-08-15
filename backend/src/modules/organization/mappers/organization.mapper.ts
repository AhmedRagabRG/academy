import type { EntityStatus } from '../../../../prisma/generated/client';
import type {
  OrganizationRecordPermissions,
  PublicBranch,
  PublicDepartment,
  PublicLookupGroup,
  PublicLookupValue,
  PublicAcademicYear,
  PublicAcademicTerm,
} from '../types/organization.types';

const lowerStatus = (status: EntityStatus): Lowercase<EntityStatus> =>
  status.toLowerCase() as Lowercase<EntityStatus>;

export function mapBranch(
  record: {
    id: string;
    organizationId: string;
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    managerId: string | null;
    workingHours: string;
    status: EntityStatus;
    version: number;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
  },
  permissions: OrganizationRecordPermissions,
): PublicBranch {
  return { ...record, status: lowerStatus(record.status), permissions };
}

export function mapAcademicYear(
  record: {
    id: string;
    organizationId: string;
    name: string;
    code: string;
    startDate: Date;
    endDate: Date;
    status: EntityStatus;
    version: number;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
  },
  permissions: OrganizationRecordPermissions,
): PublicAcademicYear {
  return {
    ...record,
    startDate: record.startDate.toISOString().slice(0, 10),
    endDate: record.endDate.toISOString().slice(0, 10),
    status: lowerStatus(record.status),
    permissions,
  };
}

export function mapAcademicTerm(
  record: {
    id: string;
    organizationId: string;
    academicYearId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    order: number;
    status: EntityStatus;
    version: number;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
    academicYear: { name: string };
  },
  permissions: OrganizationRecordPermissions,
): PublicAcademicTerm {
  const { academicYear, ...value } = record;
  return {
    ...value,
    academicYearName: academicYear.name,
    startDate: record.startDate.toISOString().slice(0, 10),
    endDate: record.endDate.toISOString().slice(0, 10),
    status: lowerStatus(record.status),
    permissions,
  };
}

export function mapLookupGroup(
  record: {
    id: string;
    organizationId: string;
    code: string;
    name: string;
    parentGroupId: string | null;
    status: EntityStatus;
    version: number;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
    _count?: { values: number; childGroups: number };
  },
  permissions: OrganizationRecordPermissions,
): PublicLookupGroup {
  const { _count, ...value } = record;
  return {
    ...value,
    status: lowerStatus(record.status),
    valueCount: _count?.values,
    childGroupCount: _count?.childGroups,
    permissions,
  };
}

export function mapLookupValue(
  record: {
    id: string;
    lookupGroupId: string;
    parentValueId: string | null;
    name: string;
    code: string;
    description: string | null;
    sortOrder: number;
    status: EntityStatus;
    version: number;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
    lookupGroup: { code: string };
  },
  permissions: OrganizationRecordPermissions,
): PublicLookupValue {
  const { lookupGroup, ...value } = record;
  return {
    ...value,
    groupCode: lookupGroup.code,
    status: lowerStatus(record.status),
    permissions,
  };
}

export function mapDepartment(
  record: {
    id: string;
    organizationId: string;
    name: string;
    code: string;
    description: string;
    status: EntityStatus;
    version: number;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
  },
  permissions: OrganizationRecordPermissions,
): PublicDepartment {
  return { ...record, status: lowerStatus(record.status), permissions };
}

export function stableByCode<T extends { code: string; id: string }>(
  values: T[],
): T[] {
  return [...values].sort(
    (left, right) =>
      left.code.localeCompare(right.code) || left.id.localeCompare(right.id),
  );
}
