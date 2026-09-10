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
import { AddSourceDialog } from "../components/add-source-dialog"
import { aiKnowledgePermissions } from "../config/ai-knowledge-permissions"
import {
  kindLabels,
  sourceStatusLabels,
  sourceStatusTones,
  visibilityLabels,
} from "../config/ai-knowledge-copy"
import {
  useKnowledgeBases,
  useKnowledgeSources,
  useReindexSource,
  useRemoveSource,
} from "../hooks/use-ai-knowledge"
import type { KnowledgeBaseId, KnowledgeSource } from "../types/domain"

const formatSize = (bytes: number | null) =>
  bytes === null ? "—" : `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`

export function KnowledgeBaseDetailScreen({
  knowledgeBaseId,
}: {
  knowledgeBaseId: string
}) {
  const id = knowledgeBaseId as KnowledgeBaseId
  const canManage = usePermission(aiKnowledgePermissions.manage)
  const bases = useKnowledgeBases()
  const sources = useKnowledgeSources(id)
  const reindex = useReindexSource()
  const remove = useRemoveSource()
  const [adding, setAdding] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<KnowledgeSource | null>(null)

  const base = bases.data?.find((item) => item.id === id)
  const failed = sources.data?.filter((source) => source.status === "failed") ?? []

  return (
    <SettingsPage
      title={base?.name ?? "قاعدة المعرفة"}
      description={
        base?.description ??
        "المستندات والنصوص التي يستند إليها المساعد الذكي عند الإجابة."
      }
      actions={
        <div className="flex gap-2">
          <Link
            href="/settings/ai/knowledge"
            className="border-border hover:bg-muted inline-flex min-h-9 items-center rounded-lg border px-3 text-sm"
          >
            رجوع
          </Link>
          {canManage && (
            <Button onClick={() => setAdding(true)}>إضافة مصدر</Button>
          )}
        </div>
      }
    >
      {failed.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <h2 className="font-medium">مصادر فشلت فهرستها</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {failed.map((source) => (
              <li key={source.id}>
                <span className="font-medium">{source.title}</span>
                {source.failureReason && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {source.failureReason}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        {sources.isLoading ? (
          <LoadingState label="جارٍ تحميل المصادر" />
        ) : sources.isError ? (
          <ErrorState
            message="تعذّر تحميل المصادر"
            onRetry={() => void sources.refetch()}
          />
        ) : !sources.data?.length ? (
          <EmptyState
            title="لا توجد مصادر بعد"
            description="ارفع مستندًا أو أضف نصًا مباشرًا ليبدأ المساعد بالاعتماد عليه."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-start">
                <tr className="border-border border-b">
                  <th className="py-2 text-start font-medium">العنوان</th>
                  <th className="py-2 text-start font-medium">النوع</th>
                  <th className="py-2 text-start font-medium">الظهور</th>
                  <th className="py-2 text-start font-medium">الحالة</th>
                  <th className="py-2 text-start font-medium">المقاطع</th>
                  <th className="py-2 text-start font-medium">الحجم</th>
                  <th className="py-2 text-start font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sources.data.map((source) => (
                  <tr key={source.id} className="border-border/60 border-b">
                    <td className="py-2" dir="auto">
                      {source.title}
                    </td>
                    <td className="py-2">{kindLabels[source.kind]}</td>
                    <td className="py-2">
                      {visibilityLabels[source.visibility]}
                    </td>
                    <td className="py-2">
                      <StatusBadge
                        label={sourceStatusLabels[source.status]}
                        tone={sourceStatusTones[source.status]}
                      />
                    </td>
                    <td className="py-2">{source.chunkCount}</td>
                    <td className="py-2">
                      <bdi>{formatSize(source.sizeBytes)}</bdi>
                    </td>
                    <td className="py-2">
                      {canManage && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={reindex.isPending}
                            onClick={() =>
                              reindex.mutate({ sourceId: source.id })
                            }
                          >
                            إعادة الفهرسة
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete(source)}
                          >
                            حذف
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddSourceDialog
        open={adding}
        knowledgeBaseId={id}
        onClose={() => setAdding(false)}
      />

      <DeleteDialog
        open={Boolean(pendingDelete)}
        title="حذف المصدر"
        description={`سيتوقف المساعد عن استخدام "${pendingDelete?.title ?? ""}" في إجاباته.`}
        pending={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          void remove
            .mutateAsync({ sourceId: pendingDelete.id })
            .then(() => setPendingDelete(null))
            .catch(() => undefined)
        }}
      />
    </SettingsPage>
  )
}
