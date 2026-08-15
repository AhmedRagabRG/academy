"use client"

import { useState } from "react"
import { Archive } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

export function ArchiveApplicantDialog({
  pending,
  onConfirm,
}: {
  pending?: boolean
  onConfirm: (reason: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  return (
    <>
      {
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Archive aria-hidden />
          أرشفة المتقدم
        </Button>
      }
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6">
            <h2 id="archive-title" className="font-heading text-lg font-bold">
              أرشفة المتقدم
            </h2>
            <p className="text-sm text-muted-foreground">
              سيبقى السجل متاحًا للتاريخ والتقارير ولن يتم حذفه.
            </p>
            <label className="block space-y-2 text-sm">
              سبب الأرشفة
              <textarea
                autoFocus
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-24 w-full rounded-lg border bg-background p-3"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                disabled={pending || !reason.trim()}
                onClick={() => onConfirm(reason)}
              >
                {pending ? "جارٍ الأرشفة..." : "تأكيد الأرشفة"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
