"use client"
import { TextField } from "@/shared/components/forms/text-field"
import { useFormContext } from "react-hook-form"
export function BatchFinancialSection() {
  const { register } = useFormContext()
  return (
    <fieldset className="grid gap-4 md:grid-cols-2">
      <legend className="col-span-full font-heading text-lg font-bold">
        الإعدادات المالية
      </legend>
      <TextField
        name="financialProfile.programPrice.amount"
        label="سعر البرنامج"
        dir="ltr"
      />
      <TextField
        name="financialProfile.registrationFee.amount"
        label="رسوم التسجيل"
        dir="ltr"
      />
      <label className="col-span-full flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          {...register("financialProfile.installmentsEnabled")}
        />
        التقسيط متاح
      </label>
    </fieldset>
  )
}
