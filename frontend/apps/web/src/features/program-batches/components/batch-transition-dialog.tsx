"use client"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
export function BatchTransitionDialog({
  label,
  destructive,
  onConfirm,
  pending,
}: {
  label: string
  destructive?: boolean
  onConfirm: (reason: string) => void
  pending?: boolean
}) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState("")
  return (
    <>
      {!open ? (
        <Button
          variant={destructive ? "destructive" : "outline"}
          onClick={() => setOpen(true)}
        >
          {label}
        </Button>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="min-w-64 space-y-3 rounded-lg border bg-card p-4 shadow-lg"
        >
          <label className="block text-sm">
            سبب الإجراء
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border bg-background p-2"
            />
          </label>
          <div className="flex gap-2">
            <Button
              disabled={pending || !reason.trim()}
              onClick={() => onConfirm(reason)}
            >
              {pending ? "جارٍ التنفيذ..." : "تأكيد"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
