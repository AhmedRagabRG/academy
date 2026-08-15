"use client"

import { useFormContext, useWatch } from "react-hook-form"
import { SelectField } from "@/shared/components/forms/select-field"
import type { AdmissionLookups } from "../types/domain"
import type { DraftAdmissionValues } from "../schemas/applicant-schema"

export function ProgramBatchField({ lookups }: { lookups: AdmissionLookups }) {
  const { control } = useFormContext<DraftAdmissionValues>()
  const kind = useWatch({ control, name: "selection.offeringKind" })
  const offeringId = useWatch({ control, name: "selection.offeringId" })
  if (kind !== "professional-program")
    return (
      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        الدبلومات والدورات لا تتطلب اختيار دفعة.
      </p>
    )
  const options = lookups.batches
    .filter((batch) => batch.programId === offeringId)
    .map((batch) => ({
      value: batch.id,
      label: `${batch.name} · ${batch.code} · ${batch.availableSeats} مقعد`,
      disabled:
        batch.status !== "registration-open" || batch.availableSeats <= 0,
    }))
  return (
    <SelectField
      name="selection.batchId"
      label="دفعة البرنامج"
      options={options}
      placeholder="اختر الدفعة"
    />
  )
}
