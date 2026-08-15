import type { PermissionKey } from "@/shared/types/foundation"
import { studentFinanceWorkspaceTab } from "@/features/student-finance"

/**
 * Tabs contributed into the student workspace by other feature modules.
 *
 * Aggregated statically, exactly as `foundation-navigation.ts` aggregates
 * per-feature navigation entries. Student Management reads this list and never
 * imports the feature a tab belongs to, so the dependency stays one-directional.
 *
 * A mutable register-at-runtime registry was tried first and rejected: the
 * workspace tab list is rendered by a client component, so registration order
 * became a timing concern with no upside over a static list.
 */
export interface StudentWorkspaceTab {
  id: string
  /** Route segment under `/students/[studentId]/`. */
  segment: string
  label: string
  permissionKey: PermissionKey
  /** Lower numbers render first. Student Management's own tabs occupy 10–40. */
  order: number
}

const contributions: readonly StudentWorkspaceTab[] = [
  studentFinanceWorkspaceTab,
]

export function studentWorkspaceTabs(): readonly StudentWorkspaceTab[] {
  return [...contributions].sort((left, right) => left.order - right.order)
}
