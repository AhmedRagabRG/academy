"use client"
import { TextField } from "@/shared/components/forms/text-field"
import type { BatchCapacity } from "../types/domain"
import { BatchCapacityIndicator } from "../components/batch-capacity-indicator"
export function BatchCapacitySection({
  capacity,
}: {
  capacity?: BatchCapacity
}) {
  return (
    <fieldset className="grid gap-4 md:grid-cols-2">
      <legend className="col-span-full font-heading text-lg font-bold">
        السعة
      </legend>
      <TextField
        name="maximumStudents"
        label="الحد الأقصى للطلاب"
        type="number"
        dir="ltr"
      />
      {capacity && (
        <div>
          <span className="mb-2 block text-sm font-medium">
            الإشغال الحالي (للقراءة فقط)
          </span>
          <BatchCapacityIndicator capacity={capacity} />
        </div>
      )}
    </fieldset>
  )
}
