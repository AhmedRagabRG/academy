"use client"

import { useFormContext } from "react-hook-form"
import { Dropdown } from "@/shared/components/forms/dropdown"
import type { AdmissionLookups } from "../types/domain"
import type { DraftAdmissionValues } from "../schemas/applicant-schema"

export function AcademicOfferingField({
  lookups,
}: {
  lookups: AdmissionLookups
}) {
  const { register, setValue } = useFormContext<DraftAdmissionValues>()
  return (
    <div className="space-y-2">
      <label htmlFor="selection.offeringId" className="text-sm font-medium">
        المنتج الأكاديمي
      </label>
      <Dropdown
        id="selection.offeringId"
        options={lookups.offerings
          .filter((item) => item.status === "active")
          .map((item) => ({
            value: item.id,
            label: `${item.name.ar} · ${item.code}`,
          }))}
        placeholder="اختر المنتج"
        {...register("selection.offeringId", {
          onChange: (event) => {
            const offering = lookups.offerings.find(
              (item) => item.id === event.target.value
            )
            if (offering) {
              setValue("selection.offeringKind", offering.kind)
              if (offering.kind !== "professional-program")
                setValue("selection.batchId", undefined)
            }
          },
        })}
      />
    </div>
  )
}
