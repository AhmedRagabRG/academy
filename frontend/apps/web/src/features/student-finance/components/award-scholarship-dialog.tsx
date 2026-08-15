"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { Money } from "@/shared/utils/money"
import type { ScholarshipPolicy } from "../types/domain"
import type { EnrollmentBalance } from "../types/projections"
import { scholarshipCopy } from "../config/finance-copy"
import {
  ScholarshipForm,
  emptyScholarshipValues,
  validateScholarship,
  type ScholarshipValues,
} from "../forms/scholarship-form"

/**
 * Awards a scholarship to a student.
 *
 * Approving an award is its own authority, so the dialog is only ever rendered
 * for a user holding it — and the service checks again regardless.
 */
export function AwardScholarshipDialog({
  open,
  pending,
  totalFees,
  policy,
  enrollments,
  onConfirm,
  onClose,
}: {
  open: boolean
  pending: boolean
  /** Tuition base the award is expressed against. */
  totalFees: Money
  policy: ScholarshipPolicy
  enrollments: readonly EnrollmentBalance[]
  onConfirm: (values: ScholarshipValues) => void
  onClose: () => void
}) {
  const baseId = useId()
  const [values, setValues] = useState<ScholarshipValues>(emptyScholarshipValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    firstFieldRef.current?.focus()
    return () => triggerRef.current?.focus()
  }, [open])

  if (!open) return null

  const submit = () => {
    const result = validateScholarship(values, { base: totalFees, policy })
    if (!result.ok) {
      setErrors(result.errors)
      const firstPath = Object.keys(result.errors)[0]
      if (firstPath) document.getElementById(`${baseId}-${firstPath}`)?.focus()
      return
    }
    setErrors({})
    onConfirm({
      ...values,
      name: values.name.trim(),
      value: values.coverage === "full-tuition" ? "100" : values.value.trim(),
      kind: values.coverage === "full-tuition" ? "percentage" : values.kind,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${baseId}-title`}
    >
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className="bg-card relative w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border p-6 shadow-xl sm:max-h-[90vh]">
        <h2 id={`${baseId}-title`} className="text-lg font-semibold">
          {scholarshipCopy.award}
        </h2>

        <ScholarshipForm
          idPrefix={baseId}
          values={values}
          errors={errors}
          policy={policy}
          enrollments={enrollments}
          firstFieldRef={firstFieldRef}
          onChange={setValues}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "جارٍ الاعتماد..." : scholarshipCopy.award}
          </Button>
        </div>
      </div>
    </div>
  )
}
