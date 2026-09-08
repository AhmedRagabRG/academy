"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import type { PipelineDraft } from "../types/domain"
import { PipelineModal } from "./pipeline-modal"

export function PipelineFormDialog({
  open,
  pending,
  onSubmit,
  onClose,
}: {
  open: boolean
  pending: boolean
  onSubmit: (draft: PipelineDraft) => void
  onClose: () => void
}) {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")

  return (
    <PipelineModal
      open={open}
      titleId="create-pipeline-title"
      onClose={onClose}
    >
      <h2 id="create-pipeline-title" className="text-lg font-medium">
        مسار جديد
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        يبدأ المسار الجديد بلا مراحل. أضف المراحل بعد إنشائه.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!code.trim() || !name.trim()) return
          onSubmit({ code: code.trim(), name: name.trim() })
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          الرمز
          <Input
            required
            dir="ltr"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="admissions"
            minLength={2}
            maxLength={60}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          الاسم
          <Input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="مسار القبول والمبيعات"
            minLength={2}
            maxLength={120}
          />
        </label>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "جارٍ الإنشاء..." : "إنشاء المسار"}
          </Button>
        </div>
      </form>
    </PipelineModal>
  )
}
