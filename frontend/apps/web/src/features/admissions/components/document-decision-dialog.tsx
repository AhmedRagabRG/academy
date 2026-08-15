"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
export function DocumentDecisionDialog({
  title,
  reasonRequired,
  pending,
  onConfirm,
  onCancel,
}: {
  title: string
  reasonRequired?: boolean
  pending?: boolean
  onConfirm: (reason?: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState("")
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6">
        <h2
          id="document-dialog-title"
          className="font-heading text-lg font-bold"
        >
          {title}
        </h2>
        {reasonRequired && (
          <label className="block space-y-2 text-sm">
            سبب الإجراء
            <textarea
              autoFocus
              className="min-h-24 w-full rounded-lg border bg-background p-3"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button
            disabled={pending || Boolean(reasonRequired && !reason.trim())}
            onClick={() => onConfirm(reason || undefined)}
          >
            تأكيد
          </Button>
        </div>
      </div>
    </div>
  )
}
