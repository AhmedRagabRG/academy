export type Brand<T, Name extends string> = T & { readonly __brand: Name }
export type EmployeeId = Brand<string, "EmployeeId">
export type RoleId = Brand<string, "RoleId">
export type BranchId = Brand<string, "BranchId">
export type PermissionKey = Brand<string, "PermissionKey">

export interface Employee {
  id: EmployeeId
  displayName: string
  email: string
  avatarUrl?: string
  roleIds: RoleId[]
  branchIds: BranchId[]
}

export interface Role {
  id: RoleId
  code: string
  displayName: string
  permissionKeys: PermissionKey[]
  status: "active" | "inactive"
}

export interface Branch {
  id: BranchId
  code: string
  displayName: string
  status: "active" | "inactive"
}

export interface EmployeeContext {
  employee: Employee
  role: Role
  branch: Branch
  organizationId?: string
  authorizedBranchIds?: BranchId[]
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
