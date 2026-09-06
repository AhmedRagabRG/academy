import type { PublicEmployee } from '../types/identity.types';

type EmployeeRecord = {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  position: string | null;
  organizationWide: boolean;
  avatar: unknown;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{
    role: {
      id: string;
      code: string;
      displayName: string;
      description: string;
      status: string;
      version: number;
      permissions: Array<{ permission: { key: string; active: boolean } }>;
    };
  }>;
};

export function mapEmployee(record: EmployeeRecord): PublicEmployee {
  const roles = record.roles
    .map(({ role }) => role)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(({ permissions, ...role }) => {
      void permissions;
      return role;
    });
  const permissionKeys = [
    ...new Set(
      record.roles.flatMap(({ role }) =>
        role.status === 'ACTIVE'
          ? role.permissions
              .filter(({ permission }) => permission.active)
              .map(({ permission }) => permission.key)
          : [],
      ),
    ),
  ].sort();
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    phone: record.phone,
    position: record.position,
    organizationWide: record.organizationWide,
    avatar: record.avatar,
    status: record.status.toLowerCase(),
    version: record.version,
    roleIds: roles.map(({ id }) => id),
    roles: roles.map((role) => ({
      ...role,
      status: role.status.toLowerCase(),
    })),
    permissionKeys,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapEmployeeContext(
  record: EmployeeRecord,
  authenticatedAt: string,
) {
  const employee = mapEmployee(record);
  return {
    employee: {
      id: employee.id,
      displayName: employee.displayName,
      email: employee.email,
      avatar: employee.avatar,
      roleIds: employee.roleIds,
    },
    roles: employee.roles,
    permissionKeys: employee.permissionKeys,
    organizationWide: employee.organizationWide,
    authenticatedAt,
  };
}
