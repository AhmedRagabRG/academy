"use client"

import { PageContainer } from "@/shared/components/layout/page-container"
import type { StudentId } from "../types/common"
import { useStudentDetail } from "../hooks/use-student-detail"
import { StudentWorkspaceHeader } from "../components/student-workspace-header"
import { StudentWorkspaceTabs } from "../components/student-workspace-tabs"
import { StudentAreaState } from "../components/student-area-states"
import { studentsPermissions } from "../config/students-permissions"

/**
 * The workspace shell. It renders the header and tabs, then hands the visible area
 * to the active route segment, which owns its own loading and error boundary.
 */
export function StudentWorkspaceLayout({
  studentId,
  children,
}: {
  studentId: string
  children: React.ReactNode
}) {
  const detail = useStudentDetail(studentId as StudentId)

  return (
    <PageContainer>
      <StudentAreaState
        permission={studentsPermissions.view}
        loading={detail.isLoading}
        error={detail.error}
        onRetry={() => void detail.refetch()}
        loadingLabel="جارٍ تحميل ملف الطالب"
      >
        {detail.data && (
          <div className="space-y-6">
            <StudentWorkspaceHeader student={detail.data} />
            <StudentWorkspaceTabs
              studentId={studentId}
              permissions={detail.data.permissions}
            />
            <div>{children}</div>
          </div>
        )}
      </StudentAreaState>
    </PageContainer>
  )
}
