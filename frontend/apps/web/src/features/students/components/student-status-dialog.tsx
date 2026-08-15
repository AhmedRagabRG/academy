"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { StudentStatus } from "../types/common"
import { studentStatusCopy } from "../config/students-copy"
import { transitionRule } from "../utils/student-lifecycle"

/**
 * Confirms a status transition and captures a reason when the policy demands one.
 * The requirement is read from the same transition table the service enforces, so
 * the dialog can never accept a change the service would refuse.
 */
export function StudentStatusDialog({
  open,
  fromStatus,
  toStatus,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean
  fromStatus: StudentStatus
  toStatus?: StudentStatus
  pending: boolean
  onConfirm: (reason?: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const reasonId = useId()
  const errorId = `${reasonId}-error`
  const firstFieldRef = useRef<HTMLTextAreaElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const rule = toStatus ? transitionRule(fromStatus, toStatus) : undefined
  const reasonRequired = rule?.reasonRequired ?? false
  const missingReason = reasonRequired && !reason.trim()

  // The parent keys this component by target status, so it mounts fresh per
  // transition and the effect only has to manage focus.
  useEffect(() => {
    if (!open) return
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    // Focus the reason field when one is needed, otherwise the safe default.
    const target = reasonRequired ? firstFieldRef.current : cancelRef.current
    target?.focus()
    return () => triggerRef.current?.focus()
  }, [open, reasonRequired])

  if (!open || !toStatus) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${reasonId}-title`}
    >
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className="bg-card relative w-full max-w-md rounded-xl border p-6 shadow-xl">
        <h2 id={`${reasonId}-title`} className="text-lg font-semibold">
          تغيير الحالة إلى {studentStatusCopy[toStatus]}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          الحالة الحالية: {studentStatusCopy[fromStatus]}
          {rule?.correction && " · إجراء تصحيحي يتطلب صلاحية خاصة"}
        </p>

        <div className="mt-4 space-y-2">
          <label htmlFor={reasonId} className="text-sm font-medium">
            السبب {reasonRequired ? "(مطلوب)" : "(اختياري)"}
          </label>
          <textarea
            id={reasonId}
            ref={firstFieldRef}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && missingReason}
            aria-describedby={touched && missingReason ? errorId : undefined}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
          />
          {touched && missingReason && (
            <p id={errorId} role="alert" className="text-destructive text-sm">
              يجب إدخال سبب لتنفيذ هذا الإجراء
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelRef} variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            disabled={pending || missingReason}
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            {pending ? "جارٍ التنفيذ..." : "تأكيد"}
          </Button>
        </div>
      </div>
    </div>
  )
}
