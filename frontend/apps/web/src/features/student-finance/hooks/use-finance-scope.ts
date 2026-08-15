"use client"

import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import { buildScopeFingerprint } from "../utils/finance-scope"

/**
 * The scope fingerprint stamped into every query key, so one user's scoped results
 * are never served to another context from cache. Derived from the shared
 * employee-context store — this module adds no store of its own.
 */
export function useFinanceScopeFingerprint(): string {
  return useEmployeeContextStore((state) => {
    const context = state.context
    if (!context) return "anonymous"
    return buildScopeFingerprint({
      userId: context.employee.id,
      userName: context.employee.displayName,
      organizationId: context.organizationId ?? "organization-alsalam",
      permissions: context.role.permissionKeys,
      authorizedBranchIds:
        context.authorizedBranchIds ?? context.employee.branchIds,
      organizationWide: context.organizationWide ?? true,
      currency: "EGP",
      precision: 2,
    })
  })
}
