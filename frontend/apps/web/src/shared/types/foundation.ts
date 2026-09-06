export type Brand<T, Name extends string> = T & { readonly __brand: Name }
export type EmployeeId = Brand<string, "EmployeeId">
export type RoleId = Brand<string, "RoleId">
export type PermissionKey = Brand<string, "PermissionKey">

export interface Employee {
  id: EmployeeId
  displayName: string
  email: string
  avatarUrl?: string
  roleIds: RoleId[]
}

export interface Role {
  id: RoleId
  code: string
  displayName: string
  permissionKeys: PermissionKey[]
  status: "active" | "inactive"
}

export interface EmployeeContext {
  employee: Employee
  role: Role
  organizationId?: string
  organizationWide?: boolean
  authenticatedAt: string
}

export class ServiceError extends Error {
  constructor(
    readonly code: string,
    readonly messageKey: string,
    readonly retryable = false,
    readonly fieldErrors?: Record<string, string>
  ) {
    super(messageKey)
    this.name = "ServiceError"
  }
}
