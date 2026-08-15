"use client"

import { Section } from "@/shared/components/layout/section"
import { Card } from "@/shared/components/layout/card"
import { SelectField } from "@/shared/components/forms/select-field"
import type { LookupOption } from "../types/common"
import type { StudentLookups } from "../types/domain"
import {
  studentFieldsCopy,
  studentSectionsCopy,
} from "../config/students-copy"

/** Only active options are selectable; inactive records stay visible but disabled. */
const toOptions = (options: readonly LookupOption[]) =>
  options.map((option) => ({
    value: option.value,
    label: option.active ? option.label : `${option.label} (غير نشط)`,
    disabled: !option.active,
  }))

export function StudentAssignmentFields({
  lookups,
}: {
  lookups: StudentLookups
}) {
  return (
    <Section title={studentSectionsCopy.academic}>
      <Card className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="assignment.registrationBranchId"
          label={studentFieldsCopy.registrationBranch}
          options={toOptions(lookups.branches)}
        />
        <SelectField
          name="assignment.studyBranchId"
          label={studentFieldsCopy.studyBranch}
          options={toOptions(lookups.branches)}
        />
        <SelectField
          name="assignment.departmentId"
          label={studentFieldsCopy.department}
          options={toOptions(lookups.departments)}
        />
        <SelectField
          name="assignment.academicGradeId"
          label={studentFieldsCopy.academicGrade}
          options={toOptions(lookups.academicGrades)}
          placeholder="بدون درجة"
        />
        <SelectField
          name="assignment.customerServiceEmployeeId"
          label={studentFieldsCopy.customerServiceEmployee}
          options={toOptions(lookups.customerServiceEmployees)}
        />
      </Card>
    </Section>
  )
}
