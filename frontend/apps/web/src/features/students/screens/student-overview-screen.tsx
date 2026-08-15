"use client"

import type { StudentId } from "../types/common"
import {
  useStudentDetail,
  useStudentEnrollments,
  useStudentFinancialSummary,
} from "../hooks/use-student-detail"
import { StudentPersonalSection } from "../components/student-personal-section"
import {
  StudentAcademicSection,
  StudentSystemSection,
} from "../components/student-academic-section"
import { StudentEnrollmentsSection } from "../components/student-enrollments-section"
import { StudentFinancialSummary } from "../components/student-financial-summary"
import { StudentAreaState } from "../components/student-area-states"
import { studentsPermissions } from "../config/students-permissions"

/**
 * Workspace overview. Each area subscribes to its own query, so a failing or
 * forbidden area degrades alone (spec US3-5, US3-6).
 */
export function StudentOverviewScreen({ studentId }: { studentId: string }) {
  const id = studentId as StudentId
  const detail = useStudentDetail(id)
  const enrollments = useStudentEnrollments(
    id,
    detail.data?.permissions.enrollments ?? false
  )
  const finance = useStudentFinancialSummary(
    id,
    detail.data?.permissions.financial ?? false
  )

  return (
    <StudentAreaState
      permission={studentsPermissions.view}
      loading={detail.isLoading}
      error={detail.error}
      onRetry={() => void detail.refetch()}
      loadingLabel="جارٍ تحميل بيانات الطالب"
    >
      {detail.data && (
        <div className="space-y-8">
          <StudentPersonalSection identity={detail.data.identity} />
          <StudentAcademicSection assignment={detail.data.assignment} />
          <StudentSystemSection
            studentCode={detail.data.studentCode}
            system={detail.data.system}
          />
          <StudentEnrollmentsSection
            enrollments={enrollments.data ?? detail.data.enrollments}
            loading={enrollments.isLoading}
            error={enrollments.error}
            onRetry={() => void enrollments.refetch()}
          />
          <StudentFinancialSummary
            result={finance.data}
            loading={finance.isLoading}
            error={finance.error}
            onRetry={() => void finance.refetch()}
          />
        </div>
      )}
    </StudentAreaState>
  )
}
