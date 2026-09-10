"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { SettingsPage } from "@/features/organization-settings/components/settings-page"
import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { DeleteDialog } from "@/shared/components/feedback/delete-dialog"
import { usePermission } from "@/shared/hooks/use-permission"
import { aiKnowledgePermissions } from "../config/ai-knowledge-permissions"
import {
  useCreateKnowledgeBase,
  useDeleteKnowledgeBase,
  useKnowledgeBases,
} from "../hooks/use-ai-knowledge"
import type { KnowledgeBase } from "../types/domain"

export function KnowledgeBasesScreen() {
  const canManage = usePermission(aiKnowledgePermissions.manage)
  const bases = useKnowledgeBases()
  const create = useCreateKnowledgeBase()
  const remove = useDeleteKnowledgeBase()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [pendingDelete, setPendingDelete] = useState<KnowledgeBase | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2) return
    await create.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    })
    setName("")
    setDescription("")
  }

  return (
    <SettingsPage
      title="قواعد المعرفة"
      description="المحتوى الذي يعتمد عليه المساعد الذكي في الإجابة. لا يجيب المساعد من خارج هذا المحتوى."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-4">
          {bases.isLoading ? (
            <LoadingState label="جارٍ تحميل قواعد المعرفة" />
          ) : bases.isError ? (
            <ErrorState
              message="تعذّر تحميل قواعد المعرفة"
              onRetry={() => void bases.refetch()}
            />
          ) : !bases.data?.length ? (
            <EmptyState
              title="لا توجد قواعد معرفة بعد"
              description="أنشئ قاعدة معرفة ثم أضف إليها المستندات التي سيعتمد عليها المساعد."
            />
          ) : (
            <ul className="divide-border divide-y">
              {bases.data.map((base) => (
                <li
                  key={base.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/settings/ai/knowledge/${base.id}`}
                      className="font-medium hover:underline"
                    >
                      {base.name}
                    </Link>
                    {base.description && (
                      <p className="text-muted-foreground truncate text-sm">
                        {base.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {base.sourceCount} مصدر
                    </span>
                    <StatusBadge
                      label={base.status === "active" ? "مفعّلة" : "متوقفة"}
                      tone={base.status === "active" ? "success" : "neutral"}
                    />
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(base)}
                      >
                        حذف
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canManage && (
          <Card className="h-fit p-4 xl:sticky xl:top-24">
            <h2 className="mb-3 font-medium">قاعدة معرفة جديدة</h2>
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">الاسم</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="border-border bg-background min-h-9 w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="سياسات الأكاديمية"
                  required
                  minLength={2}
                  maxLength={160}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">الوصف (اختياري)</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  rows={3}
                  maxLength={1000}
                />
              </label>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "جارٍ الإنشاء..." : "إنشاء"}
              </Button>
            </form>
          </Card>
        )}
      </div>

      <DeleteDialog
        open={Boolean(pendingDelete)}
        title="حذف قاعدة المعرفة"
        description={`سيؤدي هذا إلى حذف "${pendingDelete?.name ?? ""}" وكل مصادرها. لن يتمكّن المساعد من الإجابة من هذا المحتوى بعد الآن.`}
        onClose={() => setPendingDelete(null)}
        pending={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          void remove
            .mutateAsync({
              id: pendingDelete.id,
              expectedVersion: pendingDelete.version,
            })
            .then(() => setPendingDelete(null))
            .catch(() => undefined)
        }}
      />
    </SettingsPage>
  )
}
