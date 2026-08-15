"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { invoiceCopy } from "../config/finance-copy"

/**
 * Cancellation captures a reason, which the service requires (spec FR-005).
 * The shared `ConfirmDialog` has no input, so this dialog exists rather than
 * defaulting the reason to placeholder text — a cancellation with a fabricated
 * reason is worse than no cancellation.
 */
export function CancelInvoiceDialog({
  open,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean
  pending: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const fieldId = useId()
  const errorId = `${fieldId}-error`
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const missing = !reason.trim()

  useEffect(() => {
    if (!open) return
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    fieldRef.current?.focus()
    return () => triggerRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${fieldId}-title`}
    >
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className="bg-card relative w-full max-w-md rounded-xl border p-6 shadow-xl">
        <h2 id={`${fieldId}-title`} className="text-lg font-semibold">
          {invoiceCopy.cancelTitle}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {invoiceCopy.cancelDescription}
        </p>

        <div className="mt-4 space-y-2">
          <label htmlFor={fieldId} className="text-sm font-medium">
            {invoiceCopy.cancelReason} (مطلوب)
          </label>
          <textarea
            id={fieldId}
            ref={fieldRef}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && missing}
            aria-describedby={touched && missing ? errorId : undefined}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
          />
          {touched && missing && (
            <p id={errorId} role="alert" className="text-destructive text-sm">
              سبب الإلغاء مطلوب
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            className="bg-destructive text-white"
            disabled={pending || missing}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending ? "جارٍ التنفيذ..." : invoiceCopy.cancelInvoice}
          </Button>
        </div>
      </div>
    </div>
  )
}
