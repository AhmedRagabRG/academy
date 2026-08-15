"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { Money } from "@/shared/utils/money"
import type { DiscountPolicy } from "../types/domain"
import { discountCopy } from "../config/finance-copy"
import {
  DiscountForm,
  emptyDiscountValues,
  validateDiscount,
  type DiscountValues,
} from "../forms/discount-form"

/**
 * Applies a discount to an invoice.
 *
 * On an already-issued invoice the dialog says plainly that the reduction becomes
 * an adjustment rather than a change to the invoice, so the approver knows what
 * they are authorising before they authorise it.
 */
export function ApplyDiscountDialog({
  open,
  pending,
  base,
  currentFinal,
  collected,
  policy,
  isIssued,
  onConfirm,
  onClose,
}: {
  open: boolean
  pending: boolean
  /** What the reduction resolves against — see `DiscountLimits.base`. */
  base: Money
  currentFinal: Money
  collected: Money
  policy: DiscountPolicy
  isIssued: boolean
  onConfirm: (values: DiscountValues) => void
  onClose: () => void
}) {
  const baseId = useId()
  const [values, setValues] = useState<DiscountValues>(emptyDiscountValues)
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
    const result = validateDiscount(values, {
      base,
      currentFinal,
      collected,
      policy,
    })
    if (!result.ok) {
      setErrors(result.errors)
      // Move focus to the first invalid field rather than leaving the user hunting.
      const firstPath = Object.keys(result.errors)[0]
      if (firstPath) document.getElementById(`${baseId}-${firstPath}`)?.focus()
      return
    }
    setErrors({})
    onConfirm({ ...values, value: values.value.trim() })
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
      <div className="bg-card relative w-full max-w-lg space-y-4 rounded-xl border p-6 shadow-xl">
        <h2 id={`${baseId}-title`} className="text-lg font-semibold">
          {discountCopy.apply}
        </h2>

        {isIssued && (
          <p role="note" className="text-muted-foreground text-sm">
            {discountCopy.postIssuanceNotice}
          </p>
        )}

        <DiscountForm
          idPrefix={baseId}
          values={values}
          errors={errors}
          limits={{ base, currentFinal, collected, policy }}
          firstFieldRef={firstFieldRef}
          onChange={setValues}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "جارٍ التطبيق..." : discountCopy.apply}
          </Button>
        </div>
      </div>
    </div>
  )
}
