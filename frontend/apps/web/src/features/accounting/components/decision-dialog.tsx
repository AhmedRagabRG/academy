"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { DecisionKind } from "../types/common"
import { approvalCopy } from "../config/accounting-copy"

const title: Record<DecisionKind, string> = {
  approved: approvalCopy.approve,
  rejected: approvalCopy.reject,
  returned: approvalCopy.return,
}

/**
 * Confirms a decision and collects its note.
 *
 * Whether the note is required comes from the policy table, passed in — the
 * dialog does not decide which outcomes need a reason, so the form and the
 * service can never disagree about it.
 */
/**
 * Mounted only while open (see `DecisionPanel`), so each opening starts with
 * fresh state. Resetting inside an effect instead would trigger a cascading
 * render on every open.
 */
export function DecisionDialog({
  decision,
  noteRequired,
  pending,
  onConfirm,
  onClose,
}: {
  decision: DecisionKind
  noteRequired: boolean
  pending: boolean
  onConfirm: (note?: string) => void
  onClose: () => void
}) {
  const baseId = useId()
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | undefined>(undefined)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    inputRef.current?.focus()
    return () => triggerRef.current?.focus()
  }, [])

  const submit = () => {
    if (noteRequired && !note.trim()) {
      setError(approvalCopy.noteRequired)
      inputRef.current?.focus()
      return
    }
    setError(undefined)
    onConfirm(note.trim() || undefined)
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
          {title[decision]}
        </h2>

        <div className="space-y-2">
          <label htmlFor={`${baseId}-note`} className="text-sm font-medium">
            {approvalCopy.note}
            {!noteRequired && (
              <span className="text-muted-foreground"> (اختياري)</span>
            )}
          </label>
          <textarea
            id={`${baseId}-note`}
            ref={inputRef}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${baseId}-note-error` : undefined}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
          />
          {error && (
            <p
              id={`${baseId}-note-error`}
              role="alert"
              className="text-destructive text-sm"
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "جارٍ التنفيذ..." : title[decision]}
          </Button>
        </div>
      </div>
    </div>
  )
}
