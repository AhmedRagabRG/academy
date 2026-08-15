"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"

export function AdmissionTransitionDialog({
  label,
  reasonRequired = false,
  destructive = false,
  pending = false,
  onConfirm,
}: {
  label: string
  reasonRequired?: boolean
  destructive?: boolean
  pending?: boolean
  onConfirm: (reason?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  return (
    <>
      {
        <Button
          variant={destructive ? "destructive" : "outline"}
          onClick={() => setOpen(true)}
        >
          {label}
        </Button>
      }
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="transition-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-xl">
            <h2
              id="transition-title"
              className="font-heading text-lg font-bold"
            >
              {label}
            </h2>
            {reasonRequired && (
              <label className="block space-y-2 text-sm">
                سبب الإجراء
                <textarea
                  autoFocus
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-24 w-full rounded-lg border bg-background p-3"
                />
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant={destructive ? "destructive" : "default"}
                disabled={pending || (reasonRequired && !reason.trim())}
                onClick={() => onConfirm(reason || undefined)}
              >
                {pending ? "جارٍ التنفيذ..." : "تأكيد"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
