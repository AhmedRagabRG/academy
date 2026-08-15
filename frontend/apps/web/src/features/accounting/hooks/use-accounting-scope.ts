"use client"

import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import { buildScopeFingerprint } from "../utils/accounting-scope"
import { ORGANIZATION_ID } from "../data/accounting-lookups"

/**
 * The acting user's scope fingerprint, keying every Accounting query so one
 * user's scoped results are never served to another context from cache.
 *
 * Derived from the shared employee-context store — this module adds no store of
 * its own.
 */
export function useAccountingScopeFingerprint(): string {
  return useEmployeeContextStore((state) => {
    const context = state.context
    if (!context) return "anonymous"
    return buildScopeFingerprint({
      organizationId: context.organizationId ?? ORGANIZATION_ID,
      permissions: context.role.permissionKeys,
      authorizedBranchIds:
        context.authorizedBranchIds ?? context.employee.branchIds,
      organizationWide: context.organizationWide ?? true,
    })
  })
}
