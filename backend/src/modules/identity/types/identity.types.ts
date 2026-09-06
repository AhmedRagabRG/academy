export interface PublicRole {
  id: string;
  code: string;
  displayName: string;
  description: string;
  status: string;
  version: number;
}
export interface PublicEmployee {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  position: string | null;
  organizationWide: boolean;
  avatar: unknown;
  status: string;
  version: number;
  roleIds: string[];
  roles: PublicRole[];
  permissionKeys: string[];
  createdAt: Date;
  updatedAt: Date;
}
export interface PublicSession {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  current: boolean;
}
