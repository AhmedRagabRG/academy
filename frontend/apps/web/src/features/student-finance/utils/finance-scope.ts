import { allFinancePermissions } from "../config/finance-permissions"
import type { Clock } from "../types/common"

/**
 * Authenticated context supplied outside command payloads. Commands never accept
 * actor, organization, roles, or arbitrary scope. This mock enforcement exists for
 * UX and test fidelity; a future backend is authoritative.
 */
export interface FinanceServiceContext {
  userId: string
  userName: string
  organizationId: string
  permissions: readonly string[]
  authorizedBranchIds: readonly string[]
  organizationWide: boolean
  /** Stable fingerprint included in every query key so scopes never share cache. */
  scopeFingerprint: string
  currency: string
  precision: number
  /** Injected so overdue derivation is deterministic (research R10). */
  now: Clock
}

export const defaultFinanceContext: FinanceServiceContext = {
  userId: "employee-demo",
  userName: "أحمد محمد",
  organizationId: "organization-alsalam",
  permissions: allFinancePermissions,
  authorizedBranchIds: ["branch-main", "branch-cairo", "branch-giza", "branch-alex"],
  organizationWide: true,
  scopeFingerprint: "organization-alsalam:all",
  currency: "EGP",
  precision: 2,
  now: () => new Date().toISOString(),
}

export function hasFinancePermission(
  context: FinanceServiceContext,
  permission: string
): boolean {
  return context.permissions.includes(permission)
}

export interface BranchScoped {
  organizationId: string
  branchId: string
}

export function isInScope(
  record: BranchScoped,
  context: FinanceServiceContext
): boolean {
  if (record.organizationId !== context.organizationId) return false
  if (context.organizationWide) return true
  return context.authorizedBranchIds.includes(record.branchId)
}

export function branchIdsInScope(
  context: FinanceServiceContext
): readonly string[] | undefined {
  return context.organizationWide ? undefined : context.authorizedBranchIds
}

export function buildScopeFingerprint(
  context: Omit<FinanceServiceContext, "scopeFingerprint" | "now">
): string {
  const branches = context.organizationWide
    ? "all"
    : [...context.authorizedBranchIds].sort().join(",")
  return `${context.organizationId}:${branches}:${[...context.permissions].sort().join("|")}`
}
