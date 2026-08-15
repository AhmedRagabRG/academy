"use client"
import { TextField } from "@/shared/components/forms/text-field"
export function BatchScheduleSection() {
  return (
    <fieldset className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <legend className="col-span-full font-heading text-lg font-bold">
        الجدول الأكاديمي
      </legend>
      <TextField
        name="schedule.registrationStartDate"
        label="بداية التسجيل"
        type="date"
        dir="ltr"
      />
      <TextField
        name="schedule.registrationEndDate"
        label="نهاية التسجيل"
        type="date"
        dir="ltr"
      />
      <TextField
        name="schedule.studyStartDate"
        label="بداية الدراسة"
        type="date"
        dir="ltr"
      />
      <TextField
        name="schedule.studyEndDate"
        label="نهاية الدراسة"
        type="date"
        dir="ltr"
      />
      <TextField
        name="schedule.graduationDate"
        label="تاريخ التخرج"
        type="date"
        dir="ltr"
      />
    </fieldset>
  )
}
