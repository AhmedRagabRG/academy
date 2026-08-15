"use client"

import { useFormContext, useWatch } from "react-hook-form"
import { SelectField } from "@/shared/components/forms/select-field"
import { TextField } from "@/shared/components/forms/text-field"
import type { DraftAdmissionValues } from "../schemas/applicant-schema"
import type { AdmissionLookups } from "../types/domain"
import { calculateAdmissionMoney } from "../utils/admission-money"

export function AdmissionFinanceSection({
  lookups,
}: {
  lookups: AdmissionLookups
}) {
  const { control } = useFormContext<DraftAdmissionValues>()
  const offeringId = useWatch({ control, name: "selection.offeringId" })
  const batchId = useWatch({ control, name: "selection.batchId" })
  const mode = useWatch({ control, name: "financial.discountMode" }) ?? "none"
  const discountValue =
    useWatch({ control, name: "financial.discountValue" }) ?? "0"
  const source =
    lookups.batches.find((item) => item.id === batchId) ??
    lookups.offerings.find((item) => item.id === offeringId)
  let required = source?.price
  if (source) {
    try {
      required = calculateAdmissionMoney({
        price: source.price,
        fees: source.registrationFees,
        mode,
        value: discountValue,
      }).requiredAmount
    } catch {
      required = source.price
    }
  }
  return (
    <fieldset className="space-y-5">
      <legend className="font-heading text-lg font-bold text-brand-navy dark:text-foreground">
        التجهيز المالي
      </legend>
      {source ? (
        <div className="grid gap-4 rounded-lg bg-brand-navy p-4 text-white sm:grid-cols-3">
          <div>
            <p className="text-xs text-white/70">سعر المنتج</p>
            <bdi dir="ltr">
              {source.price.amount} {source.price.currency}
            </bdi>
          </div>
          <div>
            <p className="text-xs text-white/70">رسوم التسجيل</p>
            <bdi dir="ltr">
              {source.registrationFees.amount}{" "}
              {source.registrationFees.currency}
            </bdi>
          </div>
          <div>
            <p className="text-xs text-white/70">المبلغ المطلوب</p>
            <bdi dir="ltr" className="font-bold text-brand-gold">
              {required?.amount} {required?.currency}
            </bdi>
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-muted p-3 text-sm">
          اختر المنتج الأكاديمي أولًا.
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField
          name="financial.discountMode"
          label="نوع الخصم"
          options={[
            { value: "none", label: "بدون خصم" },
            { value: "percentage", label: "نسبة مئوية" },
            { value: "amount", label: "مبلغ" },
          ]}
        />
        <TextField
          name="financial.discountValue"
          label="قيمة الخصم"
          dir="ltr"
        />
      </div>
    </fieldset>
  )
}
