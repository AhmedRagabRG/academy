import type { AuthService, LoginCredentials } from "../types/auth"
import { ApiError, httpClient, refreshCsrfToken } from "@/shared/api"
import type {
  Branch,
  BranchId,
  Employee,
  EmployeeContext,
  EmployeeId,
  PermissionKey,
  Role,
  RoleId,
} from "@/shared/types/foundation"
import { ServiceError } from "@/shared/types/foundation"

/** The session payload as the identity module returns it. */
interface SessionPayload {
  employee: {
    id: string
    displayName: string
    email: string
    avatar: string | null
    roleIds: string[]
    branchIds: string[]
  }
  roles: Array<{
    id: string
    code: string
    displayName: string
    status: string
  }>
  permissionKeys: string[]
  authorizedBranchIds: string[]
  organizationWide: boolean
  authenticatedAt: string
}

const toEmployee = (payload: SessionPayload): Employee => ({
  id: payload.employee.id as EmployeeId,
  displayName: payload.employee.displayName,
  email: payload.employee.email,
  avatarUrl: payload.employee.avatar ?? undefined,
  roleIds: payload.employee.roleIds as RoleId[],
  branchIds: payload.employee.branchIds as BranchId[],
})

/**
 * Collapses the account's roles into the single role the shell reads.
 *
 * An account can hold several roles, but every consumer — `usePermission`
 * above all — asks `role.permissionKeys`. The backend has already flattened
 * the grant across all roles into the top-level `permissionKeys`, so that
 * union is what belongs here; using one role's own grants would silently
 * under-report what the employee can do.
 */
function toRole(payload: SessionPayload): Role {
  const primary = payload.roles[0]
  return {
    id: (primary?.id ?? "role-unknown") as RoleId,
    code: primary?.code ?? "unknown",
    displayName: primary?.displayName ?? "بدون دور",
    permissionKeys: payload.permissionKeys as PermissionKey[],
    status: primary?.status === "active" ? "active" : "inactive",
  }
}

/**
 * The employee's working branch.
 *
 * The session carries branch ids but no branch records, and resolving names
 * would mean a settings read that an employee without `settings.branches.view`
 * is not allowed to make. The shell only needs an identifier and a label, so
 * the id stands in until a branch-scoped read supplies more.
 */
function toBranch(payload: SessionPayload): Branch {
  const branchId = payload.authorizedBranchIds[0] ?? payload.employee.branchIds[0]
  return {
    id: (branchId ?? "branch-unassigned") as BranchId,
    code: branchId ?? "unassigned",
    displayName: payload.organizationWide ? "كل الفروع" : "الفرع المسند",
    status: "active",
  }
}

const toContext = (payload: SessionPayload): EmployeeContext => ({
  employee: toEmployee(payload),
  role: toRole(payload),
  branch: toBranch(payload),
  authorizedBranchIds: payload.authorizedBranchIds as BranchId[],
  organizationWide: payload.organizationWide,
  authenticatedAt: payload.authenticatedAt,
})

function toServiceError(error: unknown): ServiceError {
  if (!(error instanceof ApiError))
    return new ServiceError("unknown", "حدث خطأ غير متوقع", true)
  if (error.status === 401 || error.code === "INVALID_CREDENTIALS")
    return new ServiceError("invalid_credentials", "بيانات الدخول غير صحيحة")
  if (error.status === 403)
    return new ServiceError("forbidden", "لا تملك صلاحية الدخول")
  if (error.status === 429)
    return new ServiceError("rate_limited", "محاولات كثيرة. حاول لاحقًا.")
  return new ServiceError(
    error.code,
    error.message,
    error.status === 0 || error.status >= 500,
    error.fieldErrors
  )
}

export const httpAuthService: AuthService = {
  async signIn(credentials: LoginCredentials) {
    try {
      const payload = await httpClient.post<SessionPayload>(
        "/auth/login",
        credentials
      )
      // Sign-in replaces the access-token cookie the CSRF token is bound to,
      // so the token held from before this call no longer validates.
      await refreshCsrfToken()
      return toContext(payload)
    } catch (error) {
      throw toServiceError(error)
    }
  },

  async getSession() {
    try {
      const payload = await httpClient.get<SessionPayload | null>("/auth/session")
      return payload?.employee ? toContext(payload) : null
    } catch (error) {
      // An absent or expired session is the unauthenticated state, not a fault.
      if (error instanceof ApiError && error.status === 401) return null
      throw toServiceError(error)
    }
  },

  async signOut() {
    try {
      await httpClient.post("/auth/logout")
    } catch (error) {
      // A rejected sign-out still ends the local session; only a transport
      // fault is worth surfacing, since the cookie may well be gone already.
      if (error instanceof ApiError && error.status !== 0) return
      throw toServiceError(error)
    } finally {
      await refreshCsrfToken()
    }
  },
}
