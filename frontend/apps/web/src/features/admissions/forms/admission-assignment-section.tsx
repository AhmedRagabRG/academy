"use client"

import { useFormContext, useWatch } from "react-hook-form"
import { SelectField } from "@/shared/components/forms/select-field"
import type { LookupOption } from "../types/common"
import type { DraftAdmissionValues } from "../schemas/applicant-schema"
import type { AdmissionLookups } from "../types/domain"

/**
 * The branches the selected product will actually accept.
 *
 * A product is assigned to specific branches and the API refuses an admission
 * filed at any other one, so offering every branch here produced a save that
 * could only fail. An offering that publishes no assignments is treated as
 * unrestricted rather than as having none, so a gap in the data never leaves
 * the control empty.
 */
function branchOptions(
  branches: LookupOption[],
  allowed: string[] | undefined
): LookupOption[] {
  if (!allowed?.length) return branches
  const permitted = new Set(allowed)
  const matching = branches.filter((branch) => permitted.has(branch.value))
  return matching.length ? matching : branches
}

/**
 * Says so when the product is what shortened the list.
 *
 * A branch that exists and is active but is not assigned to the selected
 * product simply vanishes from the control, which reads as the branch never
 * having been created. Naming the reason points at the screen that fixes it.
 */
function narrowingHint(
  branches: LookupOption[],
  offered: LookupOption[],
  offeringSelected: boolean
): string | undefined {
  if (!offeringSelected || offered.length >= branches.length) return undefined
  return "المعروض هنا فروع المنتج الأكاديمي المختار فقط. لإتاحة فرع آخر أضِفه إلى المنتج من المسارات الأكاديمية."
}

export function AdmissionAssignmentSection({
  lookups,
}: {
  lookups: AdmissionLookups
}) {
  const { control } = useFormContext<DraftAdmissionValues>()
  const offeringId = useWatch({ control, name: "selection.offeringId" })
  const offering = lookups.offerings.find((item) => item.id === offeringId)
  const registrationBranches = branchOptions(
    lookups.branches,
    offering?.registrationBranchIds
  )
  const studyBranches = branchOptions(lookups.branches, offering?.studyBranchIds)
  return (
    <fieldset className="space-y-5">
      <legend className="font-heading text-lg font-bold text-brand-navy dark:text-foreground">
        معلومات القبول والتعيين
      </legend>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <SelectField
          name="assignment.registrationBranchId"
          label="فرع التسجيل"
          options={registrationBranches}
          placeholder="اختر الفرع"
          hint={narrowingHint(
            lookups.branches,
            registrationBranches,
            Boolean(offering)
          )}
        />
        <SelectField
          name="assignment.studyBranchId"
          label="فرع الدراسة"
          options={studyBranches}
          placeholder="اختر الفرع"
          hint={narrowingHint(lookups.branches, studyBranches, Boolean(offering))}
        />
        <SelectField
          name="assignment.admissionsEmployeeId"
          label="موظف القبول"
          options={lookups.employees}
          placeholder="اختر الموظف"
        />
        <SelectField
          name="assignment.customerServiceEmployeeId"
          label="موظف خدمة العملاء"
          options={lookups.employees}
          placeholder="اختر الموظف"
        />
        <SelectField
          name="assignment.customerServiceManagerId"
          label="مدير خدمة العملاء"
          options={lookups.managers}
          placeholder="اختر المدير"
        />
        <SelectField
          name="assignment.departmentId"
          label="القسم"
          options={lookups.departments}
          placeholder="اختر القسم"
        />
        <SelectField
          name="assignment.leadSourceId"
          label="مصدر العميل"
          options={lookups.leadSources}
          placeholder="اختر المصدر"
        />
        <SelectField
          name="assignment.academicGradeId"
          label="التقدير الأكاديمي"
          options={lookups.academicGrades}
          placeholder="اختر التقدير"
        />
      </div>
    </fieldset>
  )
}
