"use client"
import type { PermissionKey } from "@/shared/types/foundation"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
export function useMockPermission(permissionKey: string) { return useEmployeeContextStore((state) => state.context?.role.permissionKeys.includes(permissionKey as PermissionKey) ?? false) }
