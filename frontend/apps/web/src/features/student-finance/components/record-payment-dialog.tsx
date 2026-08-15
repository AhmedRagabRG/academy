"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { compare, makeMoney, type Money } from "@/shared/utils/money"
import type { InstallmentView } from "../types/projections"
import type { PaymentMethod } from "../types/domain"
import { paymentCopy } from "../config/finance-copy"
import { createPaymentSchema } from "../schemas/finance-schemas"
import { MoneyValue } from "./money-value"

export interface RecordPaymentValues {
  methodId: string
  paymentDate: string
  amount: string
  installmentId?: string
  notes?: string
}

/**
 * Records a payment against an invoice.
 *
 * Validation delegates to the same schema the service enforces, so the form can
 * never accept an amount the service would refuse — and the remaining balance is
 * shown live rather than left for the user to work out.
 */
export function RecordPaymentDialog({
  open,
  pending,
  currency,
  precision,
  invoiceRemaining,
  installments,
  methods,
  issueDate,
  today,
  onConfirm,
  onClose,
}: {
  open: boolean
  pending: boolean
  currency: string
  precision: number
  invoiceRemaining: Money
  installments: readonly InstallmentView[]
  methods: readonly PaymentMethod[]
  issueDate?: string
  today: string
  onConfirm: (values: RecordPaymentValues) => void
  onClose: () => void
}) {
  const baseId = useId()
  const [values, setValues] = useState<RecordPaymentValues>({
    methodId: "",
    paymentDate: today.slice(0, 10),
    amount: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const activeMethods = useMemo(
    () => methods.filter((method) => method.active),
    [methods]
  )

  const targetedInstallment = installments.find(
    (installment) => installment.id === values.installmentId
  )
  const ceiling = targetedInstallment?.remaining ?? invoiceRemaining

  useEffect(() => {
    if (!open) return
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    firstFieldRef.current?.focus()
    return () => triggerRef.current?.focus()
  }, [open])

  if (!open) return null

  const submit = () => {
    const schema = createPaymentSchema({
      currency,
      precision,
      invoiceRemaining,
      installmentRemaining: targetedInstallment?.remaining,
      methods,
      issueDate,
      today,
    })
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      const collected: Record<string, string> = {}
      for (const issue of parsed.error.issues)
        collected[issue.path.join(".")] ??= issue.message
      setErrors(collected)
      // Move focus to the first invalid field rather than leaving the user hunting.
      const firstPath = parsed.error.issues[0]?.path.join(".")
      if (firstPath) document.getElementById(`${baseId}-${firstPath}`)?.focus()
      return
    }
    setErrors({})
    onConfirm(parsed.data)
  }

  const fieldError = (name: string) => errors[name]

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
          {paymentCopy.record}
        </h2>

        <p className="text-muted-foreground text-sm">
          {targetedInstallment ? "المتبقي على القسط" : paymentCopy.remainingHint}:{" "}
          <MoneyValue value={ceiling} className="font-medium" />
        </p>

        <Field
          id={`${baseId}-amount`}
          label={paymentCopy.amount}
          error={fieldError("amount")}
        >
          <input
            id={`${baseId}-amount`}
            ref={firstFieldRef}
            inputMode="decimal"
            dir="ltr"
            value={values.amount}
            onChange={(event) =>
              setValues((current) => ({ ...current, amount: event.target.value }))
            }
            aria-invalid={Boolean(fieldError("amount"))}
            aria-describedby={
              fieldError("amount") ? `${baseId}-amount-error` : undefined
            }
            className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-start outline-none focus-visible:ring-2"
          />
        </Field>

        <Field
          id={`${baseId}-methodId`}
          label={paymentCopy.method}
          error={fieldError("methodId")}
        >
          <select
            id={`${baseId}-methodId`}
            value={values.methodId}
            onChange={(event) =>
              setValues((current) => ({ ...current, methodId: event.target.value }))
            }
            aria-invalid={Boolean(fieldError("methodId"))}
            className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
          >
            <option value="">اختر طريقة الدفع</option>
            {/* Only active methods are offered (spec FR-016). */}
            {activeMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id={`${baseId}-paymentDate`}
          label={paymentCopy.paymentDate}
          error={fieldError("paymentDate")}
        >
          <input
            id={`${baseId}-paymentDate`}
            type="date"
            dir="ltr"
            value={values.paymentDate}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                paymentDate: event.target.value,
              }))
            }
            aria-invalid={Boolean(fieldError("paymentDate"))}
            className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
          />
        </Field>

        {installments.length > 0 && (
          <Field id={`${baseId}-installmentId`} label={paymentCopy.targetInstallment}>
            <select
              id={`${baseId}-installmentId`}
              value={values.installmentId ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  installmentId: event.target.value || undefined,
                }))
              }
              className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
            >
              <option value="">بدون تخصيص لقسط</option>
              {installments
                .filter((installment) =>
                  compare(installment.remaining, makeMoney("0", currency, precision)) > 0
                )
                .map((installment) => (
                  <option key={installment.id} value={installment.id}>
                    قسط {installment.sequence} — {installment.remaining.amount}
                  </option>
                ))}
            </select>
          </Field>
        )}

        <Field id={`${baseId}-notes`} label={paymentCopy.notes}>
          <textarea
            id={`${baseId}-notes`}
            rows={2}
            value={values.notes ?? ""}
            onChange={(event) =>
              setValues((current) => ({ ...current, notes: event.target.value }))
            }
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
          />
        </Field>

        <p className="text-muted-foreground text-xs">{paymentCopy.immutableNotice}</p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "جارٍ التسجيل..." : paymentCopy.record}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
