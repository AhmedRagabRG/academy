"use client"

import { useEffect, useId, useRef } from "react"
import { Button } from "@workspace/ui/components/button"
import { approvalCopy } from "../config/accounting-copy"

/**
 * Confirms that payment has already happened elsewhere.
 *
 * The notice is the point: this module records the fact for reporting and audit,
 * it does not move money. Someone clicking this must not believe they are
 * releasing funds.
 *
 * Mounted only while open, so it needs no state reset.
 */
export function MarkPaidDialog({
  pending,
  onConfirm,
  onClose,
}: {
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const baseId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    confirmRef.current?.focus()
    return () => triggerRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${baseId}-title`}
    >
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="إغلاق" />
      <div className="bg-card relative w-full max-w-lg space-y-4 rounded-xl border p-6 shadow-xl">
        <h2 id={`${baseId}-title`} className="text-lg font-semibold">
          {approvalCopy.markPaid}
        </h2>
        <p role="note" className="text-muted-foreground text-sm">
          {approvalCopy.markPaidNotice}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button ref={confirmRef} onClick={onConfirm} disabled={pending}>
            {pending ? "جارٍ التسجيل..." : approvalCopy.markPaid}
          </Button>
        </div>
      </div>
    </div>
  )
}
