"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { requestCopy } from "../config/accounting-copy"
import { cancelRequestSchema } from "../schemas/expense-request-schemas"

/**
 * A dialog shell that takes focus on open and returns it to the trigger on close.
 */
function Dialog({
  titleId,
  title,
  children,
  onClose,
}: {
  titleId: string
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="إغلاق" />
      <div className="bg-card relative w-full max-w-lg space-y-4 rounded-xl border p-6 shadow-xl">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

function useDialogFocus(open: boolean, ref: React.RefObject<HTMLElement | null>) {
  const triggerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    ref.current?.focus()
    return () => triggerRef.current?.focus()
  }, [open, ref])
}

export function SubmitRequestDialog({
  open,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const baseId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)
  useDialogFocus(open, confirmRef)
  if (!open) return null

  return (
    <Dialog titleId={`${baseId}-title`} title={requestCopy.submit} onClose={onClose}>
      <p role="note" className="text-muted-foreground text-sm">
        {requestCopy.submitConfirm}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          إلغاء
        </Button>
        <Button ref={confirmRef} onClick={onConfirm} disabled={pending}>
          {pending ? "جارٍ التقديم..." : requestCopy.submit}
        </Button>
      </div>
    </Dialog>
  )
}

/**
 * Cancelling requires a real reason.
 *
 * A confirm dialog with no input would force a placeholder reason to be
 * fabricated, which puts a sentence nobody wrote into an immutable record.
 */
export function CancelRequestDialog({
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
  const baseId = useId()
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | undefined>(undefined)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useDialogFocus(open, inputRef)
  if (!open) return null

  const submit = () => {
    const parsed = cancelRequestSchema.safeParse({ reason })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message)
      inputRef.current?.focus()
      return
    }
    setError(undefined)
    onConfirm(parsed.data.reason)
  }

  return (
    <Dialog
      titleId={`${baseId}-title`}
      title={requestCopy.cancel}
      onClose={onClose}
    >
      <div className="space-y-2">
        <label htmlFor={`${baseId}-reason`} className="text-sm font-medium">
          {requestCopy.cancelReason}
        </label>
        <textarea
          id={`${baseId}-reason`}
          ref={inputRef}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${baseId}-reason-error` : undefined}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
        />
        {error && (
          <p id={`${baseId}-reason-error`} role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          تراجع
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "جارٍ الإلغاء..." : requestCopy.cancel}
        </Button>
      </div>
    </Dialog>
  )
}
