"use client"

import { useState } from "react"
import {
  Archive,
  Check,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { ConfirmDialog } from "@/shared/components/feedback/confirm-dialog"
import { DeleteDialog } from "@/shared/components/feedback/delete-dialog"
import type { PipelineRecord } from "../types/domain"

export function PipelineDetailHeader({
  pipeline,
  pipelineCount,
  canManage,
  pending,
  onRename,
  onSetDefault,
  onArchive,
  onRestore,
  onDelete,
}: {
  pipeline: PipelineRecord
  pipelineCount: number
  canManage: boolean
  pending: boolean
  onRename: (name: string) => Promise<void>
  onSetDefault: () => Promise<void>
  onArchive: () => Promise<void>
  onRestore: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(pipeline.name)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canDelete =
    canManage &&
    !pipeline.isDefault &&
    pipeline.leadCount === 0 &&
    pipelineCount > 1
  const canArchive = canManage && pipeline.active && !pipeline.isDefault

  return (
    <header className="border-b bg-card px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="flex items-center gap-2"
              onSubmit={async (event) => {
                event.preventDefault()
                if (!name.trim()) return
                await onRename(name.trim())
                setEditing(false)
              }}
            >
              <Input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={120}
                aria-label="اسم المسار"
              />
              <Button
                type="submit"
                size="icon"
                disabled={pending}
                aria-label="حفظ الاسم"
              >
                <Check aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="إلغاء التعديل"
                onClick={() => {
                  setName(pipeline.name)
                  setEditing(false)
                }}
              >
                <X aria-hidden />
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {pipeline.isDefault && (
                <Star
                  className="size-4 shrink-0 fill-brand-gold text-brand-gold"
                  aria-hidden
                />
              )}
              <h2 className="truncate text-lg font-medium text-brand-navy dark:text-foreground">
                {pipeline.name}
              </h2>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="تعديل اسم المسار"
                  onClick={() => setEditing(true)}
                >
                  <Pencil aria-hidden />
                </Button>
              )}
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            <span dir="ltr">{pipeline.code}</span> · {pipeline.leadCount} فرصة ·{" "}
            {pipeline.active ? "نشط" : "مؤرشف"}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {!pipeline.isDefault && pipeline.active && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => onSetDefault()}
              >
                <Star aria-hidden />
                اجعله افتراضيًا
              </Button>
            )}
            {pipeline.active ? (
              <Button
                variant="outline"
                disabled={pending || !canArchive}
                title={
                  pipeline.isDefault
                    ? "لا يمكن أرشفة المسار الافتراضي"
                    : undefined
                }
                onClick={() => setConfirmArchive(true)}
              >
                <Archive aria-hidden />
                أرشفة
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => onRestore()}
              >
                <RotateCcw aria-hidden />
                استعادة
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={pending || !canDelete}
              title={
                pipeline.isDefault
                  ? "لا يمكن حذف المسار الافتراضي"
                  : pipeline.leadCount > 0
                    ? "لا يمكن حذف مسار يحتوي فرصًا"
                    : pipelineCount <= 1
                      ? "يجب أن تحتوي المؤسسة على مسار واحد على الأقل"
                      : undefined
              }
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden />
              حذف
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="أرشفة المسار؟"
        description={`سيصبح "${pipeline.name}" غير متاح لفرص جديدة حتى تُعيد استعادته.`}
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
        title="حذف المسار نهائيًا؟"
        description={`لا يمكن التراجع عن حذف "${pipeline.name}". هذا الإجراء متاح فقط لمسار لا يحتوي فرصًا.`}
        pending={pending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await onDelete()
          setConfirmDelete(false)
        }}
      />
    </header>
  )
}
