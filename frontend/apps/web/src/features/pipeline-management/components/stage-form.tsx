"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { accentLabels, outcomeLabels } from "../config/pipeline-admin-labels"
import type {
  PipelineStageAccent,
  PipelineStageOutcome,
  PipelineStageRecord,
  StageDraft,
} from "../types/domain"
import { PipelineModal } from "./pipeline-modal"

export function StageFormDialog({
  open,
  pending,
  initial,
  hasEntryStage,
  onSubmit,
  onClose,
}: {
  open: boolean
  pending: boolean
  initial?: PipelineStageRecord
  /** Whether the pipeline already has an entry stage other than `initial`. */
  hasEntryStage: boolean
  onSubmit: (draft: StageDraft) => void
  onClose: () => void
}) {
  const [code, setCode] = useState(initial?.code ?? "")
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [probability, setProbability] = useState(
    String(initial?.probability ?? 0)
  )
  const [accent, setAccent] = useState<PipelineStageAccent>(
    initial?.accent ?? "slate"
  )
  const [outcome, setOutcome] = useState<PipelineStageOutcome>(
    initial?.outcome ?? "open"
  )
  const [isEntry, setIsEntry] = useState(initial?.isEntry ?? !hasEntryStage)
  const editing = Boolean(initial)
  const titleId = editing ? "edit-stage-title" : "create-stage-title"

  return (
    <PipelineModal open={open} titleId={titleId} onClose={onClose}>
      <h2 id={titleId} className="text-lg font-medium">
        {editing ? `تعديل مرحلة «${initial!.name}»` : "مرحلة جديدة"}
      </h2>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim() || (!editing && !code.trim())) return
          onSubmit({
            code: code.trim(),
            name: name.trim(),
            description: description.trim(),
            probability: Number(probability) || 0,
            accent,
            outcome,
            isEntry,
          })
        }}
      >
        {!editing && (
          <label className="grid gap-1.5 text-sm font-medium">
            الرمز
            <Input
              required
              dir="ltr"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="contacted"
              minLength={2}
              maxLength={60}
            />
          </label>
        )}
        <label className="grid gap-1.5 text-sm font-medium">
          الاسم
          <Input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="تم التواصل"
            minLength={2}
            maxLength={120}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          الوصف
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={400}
            className="min-h-16 w-full resize-y rounded-lg border border-input bg-background p-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-medium">
            الاحتمالية %
            <Input
              type="number"
              min="0"
              max="100"
              value={probability}
              onChange={(event) => setProbability(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            اللون
            <select
              value={accent}
              onChange={(event) =>
                setAccent(event.target.value as PipelineStageAccent)
              }
              className="h-10 rounded-lg border border-input bg-background px-3"
            >
              {Object.entries(accentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            نتيجة المرحلة
            <select
              value={outcome}
              onChange={(event) =>
                setOutcome(event.target.value as PipelineStageOutcome)
              }
              className="h-10 rounded-lg border border-input bg-background px-3"
            >
              {Object.entries(outcomeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={isEntry}
            disabled={initial?.isEntry}
            onChange={(event) => setIsEntry(event.target.checked)}
            className="size-4 rounded border-input"
          />
          نقطة دخول المسار
        </label>
        {initial?.isEntry && (
          <p className="text-xs text-muted-foreground">
            هذه نقطة الدخول الحالية. اجعل مرحلة أخرى نقطة الدخول لتغييرها.
          </p>
        )}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? "جارٍ الحفظ..."
              : editing
                ? "حفظ التعديلات"
                : "إضافة المرحلة"}
          </Button>
        </div>
      </form>
    </PipelineModal>
  )
}
