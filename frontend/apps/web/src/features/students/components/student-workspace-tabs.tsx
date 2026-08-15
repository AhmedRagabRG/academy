"use client"

import {
  TabNavigation,
  type TabNavigationItem,
} from "@/shared/components/layout/tab-navigation"
import { studentWorkspaceTabs } from "@/shared/config/student-workspace-tabs"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import type { StudentAreaPermissions } from "../types/projections"
import { studentTabsCopy } from "../config/students-copy"

/**
 * Tab items are filtered by permission before rendering, so a forbidden area is
 * never presented as an empty one (spec US3-6).
 *
 * Tabs owned by this module are listed directly. Tabs belonging to other modules
 * arrive through the shared registry, so Student Management never has to import —
 * or know about — the feature a tab belongs to.
 */
export function StudentWorkspaceTabs({
  studentId,
  permissions,
}: {
  studentId: string
  permissions: StudentAreaPermissions
}) {
  const base = `/students/${studentId}`

  // One subscription covering every contributed tab, rather than a hook per tab.
  const grantedKeys = useEmployeeContextStore(
    (state) => state.context?.role.permissionKeys
  )
  const granted = new Set<string>(grantedKeys ?? [])

  const items: TabNavigationItem[] = [
    { href: base, label: studentTabsCopy.overview, exact: true },
    ...(permissions.documents
      ? [{ href: `${base}/documents`, label: studentTabsCopy.documents }]
      : []),
    ...(permissions.notes
      ? [{ href: `${base}/notes`, label: studentTabsCopy.notes }]
      : []),
    ...(permissions.timeline
      ? [{ href: `${base}/timeline`, label: studentTabsCopy.timeline }]
      : []),
    ...studentWorkspaceTabs()
      .filter((tab) => granted.has(tab.permissionKey))
      .map((tab) => ({ href: `${base}/${tab.segment}`, label: tab.label })),
  ]

  return <TabNavigation items={items} ariaLabel="أقسام ملف الطالب" />
}
