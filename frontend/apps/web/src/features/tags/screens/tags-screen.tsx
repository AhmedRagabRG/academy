"use client"

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
import {
  tagColorLabels,
  tagColorSwatch,
  tagsPermissions,
} from "../config/tags-permissions"
import {
  useCreateTag,
  useDeleteTag,
  useManagedTags,
  useUpdateTag,
} from "../hooks/use-tags"
import { tagColors, type ManagedTag, type TagColor } from "../types/domain"

const field =
  "border-border bg-background min-h-9 w-full rounded-lg border px-3 py-2 text-sm"

export function TagsScreen() {
  const canCreate = usePermission(tagsPermissions.create)
  const canUpdate = usePermission(tagsPermissions.update)
  const tags = useManagedTags()
  const create = useCreateTag()
  const update = useUpdateTag()
  const remove = useDeleteTag()
  const [label, setLabel] = useState("")
  const [color, setColor] = useState<TagColor>("blue")
  const [pendingDelete, setPendingDelete] = useState<ManagedTag | null>(null)

  const pending = update.isPending || remove.isPending

  return (
    <SettingsPage
      title="الوسوم"
      description="الوسوم التي يمكن إضافتها إلى المحادثات في صندوق الوارد لتصنيفها ومتابعتها."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-4">
          {tags.isLoading ? (
            <LoadingState label="جارٍ تحميل الوسوم" />
          ) : tags.isError ? (
            <ErrorState
              message="تعذّر تحميل الوسوم"
              onRetry={() => void tags.refetch()}
            />
          ) : !tags.data?.length ? (
            <EmptyState
              title="لا توجد وسوم بعد"
              description="أنشئ وسمًا لتتمكن من تصنيف المحادثات في صندوق الوارد."
            />
          ) : (
            <ul className="divide-border divide-y">
              {tags.data.map((tag) => (
                <li
                  key={tag.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`size-3 rounded-full ${tagColorSwatch[tag.color]}`}
                    />
                    <span className="font-medium">{tag.label}</span>
                    <StatusBadge
                      label={tag.active ? "مفعّل" : "معطّل"}
                      tone={tag.active ? "success" : "neutral"}
                    />
                    <span className="text-muted-foreground text-xs">
                      {tag.usageCount} محادثة
                    </span>
                  </div>
                  {canUpdate && (
                    <div className="flex items-center gap-1">
                      <label className="sr-only" htmlFor={`color-${tag.id}`}>
                        لون {tag.label}
                      </label>
                      <select
                        id={`color-${tag.id}`}
                        className="border-border bg-background min-h-8 rounded-lg border px-2 text-xs"
                        value={tag.color}
                        disabled={pending}
                        onChange={(event) =>
                          update.mutate({
                            id: tag.id,
                            color: event.target.value as TagColor,
                          })
                        }
                      >
                        {tagColors.map((value) => (
                          <option key={value} value={value}>
                            {tagColorLabels[value]}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          update.mutate({ id: tag.id, active: !tag.active })
                        }
                      >
                        {tag.active ? "تعطيل" : "تفعيل"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(tag)}
                      >
                        حذف
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canCreate && (
          <Card className="h-fit p-4 xl:sticky xl:top-24">
            <h2 className="mb-3 font-medium">وسم جديد</h2>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (!label.trim()) return
                create.mutate({ label: label.trim(), color })
                setLabel("")
                setColor("blue")
              }}
            >
              <label className="block text-sm">
                <span className="mb-1 block">الاسم</span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className={field}
                  placeholder="عميل محتمل"
                  maxLength={60}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">اللون</span>
                <select
                  className={field}
                  value={color}
                  onChange={(event) => setColor(event.target.value as TagColor)}
                >
                  {tagColors.map((value) => (
                    <option key={value} value={value}>
                      {tagColorLabels[value]}
                    </option>
                  ))}
                </select>
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
        title="حذف الوسم"
        description={
          pendingDelete && pendingDelete.usageCount > 0
            ? `"${pendingDelete.label}" مستخدم في ${pendingDelete.usageCount} محادثة، ولا يمكن حذفه. عطّله بدلًا من ذلك ليختفي من قوائم الاختيار.`
            : `سيُحذف "${pendingDelete?.label ?? ""}" نهائيًا.`
        }
        pending={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </SettingsPage>
  )
}
