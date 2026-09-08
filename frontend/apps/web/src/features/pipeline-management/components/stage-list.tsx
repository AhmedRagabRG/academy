"use client"

import { useState } from "react"
import {
  Archive,
  ArrowDown,
  ArrowUp,
  MapPin,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { stageAccentClasses } from "@/features/lead-pipeline/components/lead-ui"
import { ConfirmDialog } from "@/shared/components/feedback/confirm-dialog"
import { DeleteDialog } from "@/shared/components/feedback/delete-dialog"
import { outcomeLabels } from "../config/pipeline-admin-labels"
import type { PipelineStageRecord } from "../types/domain"

function StageRow({
  stage,
  isFirst,
  isLast,
  canManage,
  pending,
  isOnlyActiveStage,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  stage: PipelineStageRecord
  isFirst: boolean
  isLast: boolean
  canManage: boolean
  pending: boolean
  isOnlyActiveStage: boolean
  onEdit: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const canDelete = canManage && !stage.isEntry && stage.leadCount === 0
  const canArchive =
    canManage &&
    !stage.isEntry &&
    stage.active &&
    !isOnlyActiveStage &&
    stage.leadCount === 0

  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b px-4 py-3 last:border-b-0",
        !stage.active && "bg-muted/40"
      )}
    >
      <span
        className={cn(
          "size-2.5 shrink-0 rounded-full",
          stageAccentClasses[stage.accent]
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-sm font-medium text-brand-navy dark:text-foreground">
            {stage.name}
          </strong>
          {stage.isEntry && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-[0.7rem] font-medium text-brand-blue">
              <MapPin className="size-3" aria-hidden />
              نقطة دخول
            </span>
          )}
          {!stage.active && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
              مؤرشفة
            </span>
          )}
          <span className="text-[0.7rem] text-muted-foreground">
            {outcomeLabels[stage.outcome]} · {stage.probability}%
          </span>
        </div>
        {stage.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {stage.description}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground" data-numeric>
          {stage.leadCount} فرصة
        </p>
      </div>
      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`تحريك «${stage.name}» للأعلى`}
            disabled={pending || isFirst}
            onClick={onMoveUp}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`تحريك «${stage.name}» للأسفل`}
            disabled={pending || isLast}
            onClick={onMoveDown}
          >
            <ArrowDown aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`تعديل «${stage.name}»`}
            disabled={pending}
            onClick={onEdit}
          >
            <Pencil aria-hidden />
          </Button>
          {stage.active ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`أرشفة «${stage.name}»`}
              disabled={pending || !canArchive}
              title={
                stage.isEntry
                  ? "لا يمكن أرشفة مرحلة نقطة الدخول"
                  : stage.leadCount > 0
                    ? "لا يمكن أرشفة مرحلة تحتوي فرصًا"
                    : isOnlyActiveStage
                      ? "يجب أن تبقى مرحلة نشطة واحدة على الأقل"
                      : undefined
              }
              onClick={() => setConfirmArchive(true)}
            >
              <Archive aria-hidden />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`استعادة «${stage.name}»`}
              disabled={pending}
              onClick={onRestore}
            >
              <RotateCcw aria-hidden />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`حذف «${stage.name}»`}
            disabled={pending || !canDelete}
            title={
              stage.isEntry
                ? "لا يمكن حذف مرحلة نقطة الدخول"
                : stage.leadCount > 0
                  ? "لا يمكن حذف مرحلة تحتوي فرصًا"
                  : undefined
            }
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmArchive}
        title="أرشفة المرحلة؟"
        description={`سيصبح "${stage.name}" غير متاح لفرص جديدة حتى تُعيد استعادته.`}
        confirmLabel="أرشفة"
        destructive
        pending={pending}
        onClose={() => setConfirmArchive(false)}
        onConfirm={async () => {
          await onArchive()
          setConfirmArchive(false)
        }}
      />
      <DeleteDialog
        open={confirmDelete}
        title="حذف المرحلة نهائيًا؟"
        description={`لا يمكن التراجع عن حذف "${stage.name}".`}
        pending={pending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await onDelete()
          setConfirmDelete(false)
        }}
      />
    </li>
  )
}

export function StageList({
  stages,
  canManage,
  pending,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onReorder,
}: {
  stages: PipelineStageRecord[]
  canManage: boolean
  pending: boolean
  onEdit: (stage: PipelineStageRecord) => void
  onArchive: (stage: PipelineStageRecord) => void
  onRestore: (stage: PipelineStageRecord) => void
  onDelete: (stage: PipelineStageRecord) => void
  onReorder: (orderedStages: PipelineStageRecord[]) => void
}) {
  const swap = (index: number, otherIndex: number) => {
    const next = [...stages]
    const current = next[index]
    const other = next[otherIndex]
    if (!current || !other) return
    next[index] = other
    next[otherIndex] = current
    onReorder(next)
  }

  if (!stages.length)
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        لا توجد مراحل في هذا المسار بعد.
      </p>
    )

  const activeCount = stages.filter((stage) => stage.active).length

  return (
    <ol aria-label="مراحل المسار">
      {stages.map((stage, index) => (
        <StageRow
          key={stage.id}
          stage={stage}
          isFirst={index === 0}
          isLast={index === stages.length - 1}
          canManage={canManage}
          pending={pending}
          isOnlyActiveStage={stage.active && activeCount <= 1}
          onEdit={() => onEdit(stage)}
          onArchive={() => onArchive(stage)}
          onRestore={() => onRestore(stage)}
          onDelete={() => onDelete(stage)}
          onMoveUp={() => swap(index, index - 1)}
          onMoveDown={() => swap(index, index + 1)}
        />
      ))}
    </ol>
  )
}
