"use client"

import { Plus, Star } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import type { PipelineRecord } from "../types/domain"

export function PipelineList({
  pipelines,
  selectedId,
  canCreate,
  onSelect,
  onCreate,
}: {
  pipelines: PipelineRecord[]
  selectedId: string | null
  canCreate: boolean
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <aside
      aria-label="قائمة مسارات المبيعات"
      className="flex max-h-96 flex-col overflow-hidden border-b bg-card lg:h-full lg:max-h-none lg:border-e lg:border-b-0"
    >
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-medium text-brand-navy dark:text-foreground">
          المسارات ({pipelines.length})
        </h2>
        {canCreate && (
          <Button size="sm" onClick={onCreate}>
            <Plus aria-hidden />
            مسار جديد
          </Button>
        )}
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {pipelines.map((pipeline) => {
          const active = pipeline.id === selectedId
          return (
            <li key={pipeline.id}>
              <button
                type="button"
                onClick={() => onSelect(pipeline.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-start transition-colors",
                  active
                    ? "bg-brand-blue/10 text-brand-navy dark:text-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className="flex w-full items-center gap-1.5">
                  {pipeline.isDefault && (
                    <Star
                      className="size-3.5 shrink-0 fill-brand-gold text-brand-gold"
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 truncate text-sm font-medium">
                    {pipeline.name}
                  </span>
                </span>
                <span className="flex w-full items-center gap-2 text-xs text-muted-foreground">
                  <span dir="ltr">{pipeline.code}</span>
                  <span aria-hidden>·</span>
                  <span data-numeric>{pipeline.leadCount} فرصة</span>
                  {!pipeline.active && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
                      مؤرشف
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
