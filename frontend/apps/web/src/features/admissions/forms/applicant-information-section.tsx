"use client"

import { useFormContext } from "react-hook-form"
import { TextField } from "@/shared/components/forms/text-field"
import { TextareaField } from "@/shared/components/forms/textarea-field"
import { SelectField } from "@/shared/components/forms/select-field"
import { ImageUploadField } from "@/shared/components/forms/image-upload-field"
import type { AdmissionLookups } from "../types/domain"

export function ApplicantInformationSection({
  lookups,
}: {
  lookups: AdmissionLookups
}) {
  const { setValue } = useFormContext()
  return (
    <fieldset className="space-y-5">
      <legend className="font-heading text-lg font-bold text-brand-navy dark:text-foreground">
        البيانات الشخصية والتعليمية
      </legend>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <TextField name="applicant.fullName" label="الاسم الكامل" />
        <TextField
          name="applicant.primaryPhone"
          label="رقم الهاتف"
          type="tel"
          dir="ltr"
        />
        <TextField
          name="applicant.guardianPhone"
          label="رقم ولي الأمر"
          type="tel"
          dir="ltr"
        />
        <TextField name="applicant.nationalId" label="الرقم القومي" dir="ltr" />
        <TextField
          name="applicant.dateOfBirth"
          label="تاريخ الميلاد"
          type="date"
          dir="ltr"
        />
        <SelectField
          name="applicant.qualificationId"
          label="المؤهل"
          options={lookups.qualifications}
          placeholder="اختر المؤهل"
        />
        <TextField
          name="applicant.graduationYear"
          label="سنة التخرج"
          type="number"
          dir="ltr"
        />
      </div>
      <TextField name="applicant.address" label="العنوان" />
      <TextField
        name="applicant.alternativeIdentityReason"
        label="سبب عدم توفر الرقم القومي"
      />
      <TextareaField name="applicant.notes" label="ملاحظات المتقدم" />
      <ImageUploadField
        label="الصورة الشخصية"
        onFiles={(files) => {
          const file = files[0]
          if (file) {
            setValue("applicant.profileImageUrl", URL.createObjectURL(file), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        }}
      />
    </fieldset>
  )
}
