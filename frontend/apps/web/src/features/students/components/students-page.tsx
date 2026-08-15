"use client"

import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { usePermission } from "@/shared/hooks/use-permission"
import { studentsCopy } from "../config/students-copy"
import { studentsPermissions } from "../config/students-permissions"
import { StudentForbiddenState } from "./student-area-states"

/** Page shell with a route-level permission gate. */
export function StudentsPage({
  title,
  description,
  actions,
  children,
  permission = studentsPermissions.view,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  permission?: string
}) {
  const allowed = usePermission(permission)
  return (
    <PageContainer>
      <PageHeader
        title={title}
        description={description}
        actions={allowed ? actions : undefined}
      />
      {allowed ? (
        children
      ) : (
        <StudentForbiddenState message={studentsCopy.forbidden} />
      )}
    </PageContainer>
  )
}
