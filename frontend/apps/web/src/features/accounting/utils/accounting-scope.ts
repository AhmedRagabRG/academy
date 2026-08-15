import type { ActorRef } from "../types/common"
import { CURRENCY, ORGANIZATION_ID, PRECISION } from "../data/accounting-lookups"

/**
 * Everything the service needs about *who is acting*, supplied outside every
 * command payload — so a command can never widen its own scope.
 */
export interface AccountingServiceContext {
  organizationId: string
  actor: ActorRef
  permissions: readonly string[]
  authorizedBranchIds: readonly string[]
  organizationWide: boolean
  currency: string
  precision: number
  /** Injected, so overdue-style derivations and timestamps stay deterministic. */
  now: () => string
  scopeFingerprint: string
}

export function hasPermission(
  context: AccountingServiceContext,
  permission: string
): boolean {
  return context.permissions.includes(permission)
}

/**
 * Organization is checked **before** branch membership: a branch id that happens
 * to match in another organization must still be refused.
 */
export function isInScope(
  record: { organizationId: string; branchId: string },
  context: AccountingServiceContext
): boolean {
  if (record.organizationId !== context.organizationId) return false
  if (context.organizationWide) return true
  return context.authorizedBranchIds.includes(record.branchId)
}

/**
 * Keys every cached query. Two scopes must never read each other's results, and
 * the same scope must never miss its cache because a list arrived in a different
 * order — hence the sorting.
 */
export function buildScopeFingerprint(context: {
  organizationId: string
  permissions: readonly string[]
  authorizedBranchIds: readonly string[]
  organizationWide: boolean
}): string {
  const branches = context.organizationWide
    ? "all"
    : [...context.authorizedBranchIds].sort().join(",")
  const permissions = [...context.permissions].sort().join(",")
  return `${context.organizationId}:${branches}:${permissions}`
}

const DEFAULT_NOW = "2026-08-01T12:00:00.000Z"

const baseContext = {
  organizationId: ORGANIZATION_ID,
  actor: { id: "employee-1", name: "موظف داخلي", active: true },
  permissions: [] as readonly string[],
  authorizedBranchIds: [] as readonly string[],
  organizationWide: true,
  // From the configuration module, not repeated here.
  currency: CURRENCY,
  precision: PRECISION,
}

export function createAccountingContext(
  patch: Partial<Omit<AccountingServiceContext, "scopeFingerprint">> = {}
): AccountingServiceContext {
  const merged = { ...baseContext, ...patch }
  return {
    ...merged,
    now: patch.now ?? (() => DEFAULT_NOW),
    scopeFingerprint: buildScopeFingerprint(merged),
  }
}
