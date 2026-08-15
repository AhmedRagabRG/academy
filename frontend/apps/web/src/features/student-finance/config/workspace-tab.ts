import type { PermissionKey } from "@/shared/types/foundation"
import { financePermissions } from "./finance-permissions"

/**
 * The per-student financial workspace lives inside the existing student workspace
 * rather than at a second student route, so the record is never split across two
 * competing pages (research R7).
 *
 * Shape matches `StudentWorkspaceTab` in `shared/config/student-workspace-tabs.ts`.
 * It is declared here rather than imported from there to keep the dependency
 * pointing one way: shared aggregates features, features do not read the aggregate.
 */
export const studentFinanceWorkspaceTab = {
  id: "student-finance",
  segment: "finance",
  label: "الشؤون المالية",
  permissionKey: financePermissions.view as PermissionKey,
  order: 50,
} as const
