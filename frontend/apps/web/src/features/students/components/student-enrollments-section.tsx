"use client"

import { Card } from "@/shared/components/layout/card"
import { Section } from "@/shared/components/layout/section"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import type { StudentEnrollment } from "../types/domain"
import {
  enrollmentStatusCopy,
  offeringKindCopy,
  studentSectionsCopy,
} from "../config/students-copy"
import { enrollmentBatchLabel } from "../utils/enrollment-rules"
import { formatDate } from "../utils/student-format"
import { StudentAreaState, StudentBidiValue } from "./student-area-states"
import { studentsPermissions } from "../config/students-permissions"

const tone: Record<
  StudentEnrollment["status"],
  "success" | "warning" | "danger" | "neutral"
> = {
  active: "success",
  completed: "neutral",
  suspended: "warning",
  withdrawn: "danger",
}

/**
 * Enrollments are display-only. There is deliberately no create, edit, or remove
 * affordance here — enrollment is owned by Admissions (spec FR-014). Labels come
 * from the values recorded at intake, so an archived product still renders (FR-015).
 */
export function StudentEnrollmentsSection({
  enrollments,
  loading,
  error,
  onRetry,
}: {
  enrollments: readonly StudentEnrollment[]
  loading: boolean
  error?: unknown
  onRetry?: () => void
}) {
  return (
    <Section title={studentSectionsCopy.enrollments}>
      <StudentAreaState
        permission={studentsPermissions.enrollmentsView}
        loading={loading}
        error={error}
        onRetry={onRetry}
        isEmpty={enrollments.length === 0}
        emptyTitle="لا توجد تسجيلات أكاديمية"
        emptyDescription="لم يُسجَّل هذا الطالب في أي منتج أكاديمي بعد."
        loadingLabel="جارٍ تحميل التسجيلات"
      >
        <ul className="space-y-3">
          {enrollments.map((enrollment) => {
            const batch = enrollmentBatchLabel(enrollment)
            return (
              <li key={enrollment.id}>
                <Card className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{enrollment.offeringLabel}</p>
                    <p className="text-muted-foreground text-sm">
                      {offeringKindCopy[enrollment.offeringKind]} ·{" "}
                      <StudentBidiValue>
                        {enrollment.offeringCode}
                      </StudentBidiValue>
                    </p>
                    {batch && (
                      <p className="text-muted-foreground text-sm">
                        المجموعة: {batch}
                        {enrollment.batchCode && (
                          <>
                            {" "}
                            ·{" "}
                            <StudentBidiValue>
                              {enrollment.batchCode}
                            </StudentBidiValue>
                          </>
                        )}
                      </p>
                    )}
                    <p className="text-muted-foreground text-sm">
                      تاريخ التسجيل:{" "}
                      <StudentBidiValue>
                        {formatDate(enrollment.enrollmentDate)}
                      </StudentBidiValue>
                    </p>
                  </div>
                  <StatusBadge
                    label={enrollmentStatusCopy[enrollment.status]}
                    tone={tone[enrollment.status]}
                  />
                </Card>
              </li>
            )
          })}
        </ul>
      </StudentAreaState>
    </Section>
  )
}
