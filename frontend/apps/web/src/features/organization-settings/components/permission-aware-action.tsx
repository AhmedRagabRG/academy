"use client"
import { useMockPermission } from "../hooks/use-mock-permission"
export function PermissionAwareAction({ permissionKey, children, reason = "لا تملك صلاحية تنفيذ هذا الإجراء" }: { permissionKey: string; children: React.ReactNode; reason?: string }) { const allowed = useMockPermission(permissionKey); return allowed ? children : <span title={reason} aria-label={reason} className="cursor-not-allowed opacity-50">{children}</span> }
