import type { EntityStatus } from '../../../../prisma/generated/client';
import type {
  OrganizationRecordPermissions,
  PublicLookupGroup,
  PublicLookupValue,
} from '../types/organization.types';

const lowerStatus = (status: EntityStatus): Lowercase<EntityStatus> =>
  status.toLowerCase() as Lowercase<EntityStatus>;

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



export function stableByCode<T extends { code: string; id: string }>(
  values: T[],
): T[] {
  return [...values].sort(
    (left, right) =>
      left.code.localeCompare(right.code) || left.id.localeCompare(right.id),
  );
}
