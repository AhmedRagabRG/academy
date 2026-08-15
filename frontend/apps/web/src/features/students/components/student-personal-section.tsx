import { Card } from "@/shared/components/layout/card"
import { Section } from "@/shared/components/layout/section"
import type { StudentIdentity } from "../types/domain"
import { studentFieldsCopy, studentSectionsCopy } from "../config/students-copy"
import { formatDate } from "../utils/student-format"
import { StudentDetailList, type DetailEntry } from "./student-detail-list"

export function StudentPersonalSection({
  identity,
}: {
  identity: StudentIdentity
}) {
  const entries: DetailEntry[] = [
    { label: studentFieldsCopy.fullName, value: identity.fullName },
    {
      label: studentFieldsCopy.primaryPhone,
      value: identity.primaryPhone,
      bidi: true,
    },
    {
      label: studentFieldsCopy.guardianPhone,
      value: identity.guardianPhone,
      bidi: true,
    },
    // Without a national identifier the recorded alternative reason takes its place.
    identity.nationalId
      ? {
          label: studentFieldsCopy.nationalId,
          value: identity.nationalId,
          bidi: true,
        }
      : {
          label: studentFieldsCopy.alternativeIdentityReason,
          value: identity.alternativeIdentityReason,
        },
    { label: studentFieldsCopy.address, value: identity.address },
    {
      label: studentFieldsCopy.dateOfBirth,
      value: formatDate(identity.dateOfBirth),
      bidi: true,
    },
    {
      label: studentFieldsCopy.qualification,
      value: identity.qualificationLabel,
    },
    {
      label: studentFieldsCopy.graduationYear,
      value: identity.graduationYear,
      bidi: true,
    },
  ]

  return (
    <Section title={studentSectionsCopy.personal}>
      <Card>
        <StudentDetailList entries={entries} />
      </Card>
    </Section>
  )
}
