"use client"
import { useWatch } from "react-hook-form"
import { TextField } from "@/shared/components/forms/text-field"
import { SwitchField } from "@/shared/components/forms/switch-field"
import { SelectField } from "@/shared/components/forms/select-field"
/**
 * Every field binds to the `amount` of a `Money`, as a decimal string.
 *
 * These are text inputs with `inputMode="decimal"` rather than `type="number"`,
 * because a number input hands React Hook Form a float — the one thing a price
 * must never become (see `utils/catalog-money.ts`).
 */
const fields = [
  ["pricing.basePrice.amount", "السعر الأساسي"],
  ["pricing.registrationFees.amount", "رسوم التسجيل"],
  ["pricing.certificateFees.amount", "رسوم الشهادة"],
  ["pricing.trainingFees.amount", "رسوم التدريب"],
  ["pricing.cardFees.amount", "رسوم البطاقة"],
  ["pricing.examFees.amount", "رسوم الاختبار"],
  ["pricing.additionalFees.amount", "رسوم إضافية"],
  ["pricing.discount.amount", "خصم مرجعي"],
  ["pricing.scholarship.amount", "منحة مرجعية"],
] as const
export function ProductPricingSection() {
  const installmentAvailable = useWatch({ name: "pricing.installmentAvailable" })
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {fields.map(([name, label]) => (
        <TextField
          key={name}
          name={name}
          label={label}
          inputMode="decimal"
          dir="ltr"
        />
      ))}
      <SwitchField name="pricing.installmentAvailable" label="التقسيط متاح" />
      {installmentAvailable && (
        <>
          <TextField
            name="pricing.installmentMinCount"
            label="أقل عدد أقساط"
            type="number"
            min={1}
            max={60}
          />
          <TextField
            name="pricing.installmentMaxCount"
            label="أقصى عدد أقساط"
            type="number"
            min={1}
            max={60}
          />
          <SelectField
            name="pricing.installmentFrequency"
            label="دورية السداد"
            options={[
              { value: "weekly", label: "كل أسبوع" },
              { value: "monthly", label: "كل شهر" },
              { value: "bimonthly", label: "كل شهرين" },
            ]}
          />
        </>
      )}
      <p className="text-sm text-muted-foreground md:col-span-3">
        هذه أسعار مرجعية للمسارات الأكاديمية ولا تمثل السعر النهائي للتسجيل.
      </p>
    </div>
  )
}
