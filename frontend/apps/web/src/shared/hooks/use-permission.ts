"use client"

import type { PermissionKey } from "@/shared/types/foundation"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"

/**
 * Whether the signed-in employee holds a permission key.
 *
 * Shared infrastructure: it reads only the shared employee-context store, so a
 * feature never has to reach into another feature's internals to check a
 * permission. This is a UX affordance — the service layer performs the
 * authoritative check on every operation.
 */
export function usePermission(permissionKey: string): boolean {
  return useEmployeeContextStore(
    (state) =>
      state.context?.role.permissionKeys.includes(
        permissionKey as PermissionKey
      ) ?? false
  )
}
