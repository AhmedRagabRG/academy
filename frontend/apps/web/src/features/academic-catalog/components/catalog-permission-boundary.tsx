"use client"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
export function CatalogPermissionBoundary({
  permission,
  children,
  fallback = null,
}: {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return useMockPermission(permission) ? children : fallback
}
