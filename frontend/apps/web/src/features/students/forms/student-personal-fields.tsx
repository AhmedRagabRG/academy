"use client"

import { useFormContext } from "react-hook-form"
import { Section } from "@/shared/components/layout/section"
import { Card } from "@/shared/components/layout/card"
import { TextField } from "@/shared/components/forms/text-field"
import { TextareaField } from "@/shared/components/forms/textarea-field"
import { SelectField } from "@/shared/components/forms/select-field"
import type { StudentLookups } from "../types/domain"
import {
  studentFieldsCopy,
  studentSectionsCopy,
} from "../config/students-copy"
import { guardianPhoneRequired } from "../utils/student-identity-rules"

export function StudentPersonalFields({
  lookups,
  today,
}: {
  lookups: StudentLookups
  today: string
}) {
  const { watch } = useFormContext()
  const dateOfBirth: string = watch("identity.dateOfBirth") ?? ""
  const nationalId: string = watch("identity.nationalId") ?? ""

  // Both conditions mirror the authoritative schema so the form reveals exactly
  // the fields the schema will demand.
  const guardianRequired = dateOfBirth
    ? guardianPhoneRequired(dateOfBirth, lookups.identityRules, today)
    : false
  const alternativeRequired = !nationalId.trim()

  return (
    <Section title={studentSectionsCopy.personal}>
      <Card className="grid gap-4 sm:grid-cols-2">
        <TextField name="identity.fullName" label={studentFieldsCopy.fullName} />
        <TextField
          name="identity.primaryPhone"
          label={studentFieldsCopy.primaryPhone}
          dir="ltr"
        />
        <TextField
          name="identity.guardianPhone"
          label={`${studentFieldsCopy.guardianPhone}${guardianRequired ? " *" : ""}`}
          dir="ltr"
        />
        <TextField
          name="identity.nationalId"
          label={studentFieldsCopy.nationalId}
          dir="ltr"
        />
        {alternativeRequired && (
          <div className="sm:col-span-2">
            <TextareaField
              name="identity.alternativeIdentityReason"
              label={`${studentFieldsCopy.alternativeIdentityReason} *`}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <TextareaField
            name="identity.address"
            label={studentFieldsCopy.address}
          />
        </div>
        <TextField
          name="identity.dateOfBirth"
          label={studentFieldsCopy.dateOfBirth}
          type="date"
          dir="ltr"
        />
        <SelectField
          name="identity.qualificationId"
          label={studentFieldsCopy.qualification}
          options={lookups.qualifications
            .filter((option) => option.active)
            .map((option) => ({ value: option.value, label: option.label }))}
        />
        <TextField
          name="identity.graduationYear"
          label={studentFieldsCopy.graduationYear}
          type="number"
          dir="ltr"
        />
      </Card>
    </Section>
  )
}
