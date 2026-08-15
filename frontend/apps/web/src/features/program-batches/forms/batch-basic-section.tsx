"use client"
import { TextField } from "@/shared/components/forms/text-field"
import { TextareaField } from "@/shared/components/forms/textarea-field"
import { SelectField } from "@/shared/components/forms/select-field"
import type { BatchLookups } from "../types/domain"
export function BatchBasicSection({
  lookups,
  locked = false,
}: {
  lookups: BatchLookups
  locked?: boolean
}) {
  return (
    <fieldset className="grid gap-4 md:grid-cols-2">
      <legend className="col-span-full font-heading text-lg font-bold">
        المعلومات الأساسية
      </legend>
      <TextField name="name.ar" label="اسم الدفعة بالعربية" />
      <TextField name="name.en" label="اسم الدفعة بالإنجليزية" dir="ltr" />
      <TextField name="code" label="رمز الدفعة" dir="ltr" disabled={locked} />
      <SelectField
        name="academicYearId"
        label="العام الأكاديمي"
        options={lookups.academicYears}
      />
      <SelectField
        name="intakeId"
        label="فترة القبول"
        options={lookups.intakes}
      />
      <div className="md:col-span-2">
        <TextareaField name="description" label="الوصف" />
      </div>
    </fieldset>
  )
}
