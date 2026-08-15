import { Card } from "@/shared/components/layout/card"
import { Section } from "@/shared/components/layout/section"
import type { StudentAssignment, StudentSystemInfo } from "../types/domain"
import { studentFieldsCopy, studentSectionsCopy } from "../config/students-copy"
import { formatDate } from "../utils/student-format"
import { StudentDetailList, type DetailEntry } from "./student-detail-list"

export function StudentAcademicSection({
  assignment,
}: {
  assignment: StudentAssignment
}) {
  const entries: DetailEntry[] = [
    {
      label: studentFieldsCopy.registrationBranch,
      value: assignment.registrationBranchLabel,
    },
    {
      label: studentFieldsCopy.studyBranch,
      value: assignment.studyBranchLabel,
    },
    { label: studentFieldsCopy.department, value: assignment.departmentLabel },
    {
      label: studentFieldsCopy.academicGrade,
      value: assignment.academicGradeLabel,
    },
    {
      label: studentFieldsCopy.customerServiceEmployee,
      value: assignment.customerServiceEmployeeName,
    },
  ]

  return (
    <Section title={studentSectionsCopy.academic}>
      <Card>
        <StudentDetailList entries={entries} />
      </Card>
    </Section>
  )
}

/** Admission-derived facts. Read-only here by design (spec FR-008). */
export function StudentSystemSection({
  studentCode,
  system,
}: {
  studentCode: string
  system: StudentSystemInfo
}) {
  const entries: DetailEntry[] = [
    { label: studentFieldsCopy.studentCode, value: studentCode, bidi: true },
    {
      label: studentFieldsCopy.admissionReference,
      value: system.admissionReference,
      bidi: true,
    },
    {
      label: studentFieldsCopy.admissionDate,
      value: formatDate(system.admissionDate),
      bidi: true,
    },
    {
      label: studentFieldsCopy.enrollmentDate,
      value: formatDate(system.enrollmentDate),
      bidi: true,
    },
  ]

  return (
    <Section title={studentSectionsCopy.system}>
      <Card>
        <StudentDetailList entries={entries} />
      </Card>
    </Section>
  )
}
