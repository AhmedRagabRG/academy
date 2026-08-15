import { Section } from "@/shared/components/layout/section"
import { Card } from "@/shared/components/layout/card"
import type { StudentSystemInfo } from "../types/domain"
import {
  studentFieldsCopy,
  studentSectionsCopy,
} from "../config/students-copy"
import { formatDate } from "../utils/student-format"
import { StudentDetailList } from "../components/student-detail-list"

/**
 * Admission-derived facts, rendered as read-only text rather than disabled inputs.
 * A disabled input still reads as "a field you might edit"; plain text does not
 * (spec FR-008, US4-3).
 */
export function StudentProtectedFields({
  studentCode,
  system,
}: {
  studentCode: string
  system: StudentSystemInfo
}) {
  return (
    <Section title={studentSectionsCopy.system}>
      <Card className="space-y-3">
        <p className="text-muted-foreground text-sm">
          هذه البيانات مصدرها طلب القبول المعتمد ولا يمكن تعديلها من هنا.
        </p>
        <StudentDetailList
          entries={[
            {
              label: studentFieldsCopy.studentCode,
              value: studentCode,
              bidi: true,
            },
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
          ]}
        />
      </Card>
    </Section>
  )
}
