"use client"

import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import { buildScopeFingerprint } from "../utils/students-scope"

/**
 * The scope fingerprint stamped into every query key, so one employee's scoped
 * results are never served to another context from cache. Derived from the shared
 * employee-context store — this module adds no store of its own.
 */
export function useStudentScopeFingerprint(): string {
  return useEmployeeContextStore((state) => {
    const context = state.context
    if (!context) return "anonymous"
    return buildScopeFingerprint({
      employeeId: context.employee.id,
      employeeName: context.employee.displayName,
      organizationId: context.organizationId ?? "organization-alsalam",
      permissions: context.role.permissionKeys,
      authorizedBranchIds:
        context.authorizedBranchIds ?? context.employee.branchIds,
      organizationWide: context.organizationWide ?? true,
    })
  })
}
