"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { clampToZero, subtract, sum, type Money } from "@/shared/utils/money"
import { refundCopy } from "../config/finance-copy"
import { createRefundSchema } from "../schemas/finance-schemas"
import { MoneyValue } from "../components/money-value"

export interface RefundValues {
  amount: string
  reason: string
  refundDate: string
}

/**
 * What is still refundable on a payment: the payment less every refund that has
 * not been rejected or cancelled. An approved-but-uncompleted refund still holds
 * its share, because it is expected to complete.
 */
export function refundableAmount(
  payment: Money,
  priorRefunds: readonly { amount: Money; status: string }[]
): Money {
  const held = priorRefunds.filter(
    (refund) => refund.status !== "rejected" && refund.status !== "cancelled"
  )
  return clampToZero(
    subtract(
      payment,
      sum(held.map((refund) => refund.amount), payment.currency, payment.precision)
    )
  )
}

/**
 * Requests a refund against one payment.
 *
 * The ceiling is shown before it is hit, and the dialog states plainly that
 * recording a refund documents the effect on the balance — it does not move money
 * to the student, which happens outside this module.
 */
export function RefundForm({
  open,
  pending,
  receiptNumber,
  refundable,
  today,
  onConfirm,
  onClose,
}: {
  open: boolean
  pending: boolean
  receiptNumber: string
  refundable: Money
  today: string
  onConfirm: (values: RefundValues) => void
  onClose: () => void
}) {
  const baseId = useId()
  const [values, setValues] = useState<RefundValues>({
    amount: "",
    reason: "",
    refundDate: today.slice(0, 10),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const schema = useMemo(
    () =>
      createRefundSchema({
        currency: refundable.currency,
        precision: refundable.precision,
        refundable,
        today,
      }),
    [refundable, today]
  )

  useEffect(() => {
    if (!open) return
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    firstFieldRef.current?.focus()
    return () => triggerRef.current?.focus()
  }, [open])

  if (!open) return null

  const submit = () => {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      const collected: Record<string, string> = {}
      for (const issue of parsed.error.issues)
        collected[issue.path.join(".")] ??= issue.message
      setErrors(collected)
      const firstPath = parsed.error.issues[0]?.path.join(".")
      if (firstPath) document.getElementById(`${baseId}-${firstPath}`)?.focus()
      return
    }
    setErrors({})
    onConfirm(parsed.data)
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
          {refundCopy.request}
        </h2>

        <p className="text-muted-foreground text-sm">
          {refundCopy.relatedPayment}: <bdi dir="ltr">{receiptNumber}</bdi> ·{" "}
          {refundCopy.refundableHint}: <MoneyValue value={refundable} />
        </p>

        <div className="space-y-2">
          <label htmlFor={`${baseId}-amount`} className="text-sm font-medium">
            المبلغ
          </label>
          <input
            id={`${baseId}-amount`}
            ref={firstFieldRef}
            inputMode="decimal"
            dir="ltr"
            value={values.amount}
            onChange={(event) =>
              setValues((current) => ({ ...current, amount: event.target.value }))
            }
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? `${baseId}-amount-error` : undefined}
            className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-start outline-none focus-visible:ring-2"
          />
          <FieldError id={`${baseId}-amount-error`} message={errors.amount} />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${baseId}-refundDate`} className="text-sm font-medium">
            {refundCopy.refundDate}
          </label>
          <input
            id={`${baseId}-refundDate`}
            type="date"
            value={values.refundDate}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                refundDate: event.target.value,
              }))
            }
            aria-invalid={Boolean(errors.refundDate)}
            aria-describedby={
              errors.refundDate ? `${baseId}-refundDate-error` : undefined
            }
            className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
          />
          <FieldError
            id={`${baseId}-refundDate-error`}
            message={errors.refundDate}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${baseId}-reason`} className="text-sm font-medium">
            السبب
          </label>
          <textarea
            id={`${baseId}-reason`}
            rows={2}
            value={values.reason}
            onChange={(event) =>
              setValues((current) => ({ ...current, reason: event.target.value }))
            }
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={errors.reason ? `${baseId}-reason-error` : undefined}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
          />
          <FieldError id={`${baseId}-reason-error`} message={errors.reason} />
        </div>

        <p role="note" className="text-muted-foreground text-sm">
          {refundCopy.executionNotice}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "جارٍ التسجيل..." : refundCopy.request}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  )
}
