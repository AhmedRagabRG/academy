"use client"

import type { LucideIcon } from "lucide-react"
import { Circle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export type TimelineTone = "neutral" | "success" | "warning" | "danger"

export interface TimelineItem {
  id: string
  /** ISO timestamp; the caller formats the visible label. */
  occurredAt: string
  occurredAtLabel: string
  title: string
  description?: string
  actor?: string
  icon?: LucideIcon
  tone?: TimelineTone
}

const toneRing: Record<TimelineTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  danger:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
}

/**
 * Presentational chronological list. It holds no business logic, fetches nothing,
 * and knows nothing about any particular domain. Tone is decorative only — every
 * item carries its meaning in text, so status is never colour-only.
 */
export function Timeline({
  items,
  hasMore = false,
  loading = false,
  loadMoreLabel = "عرض المزيد",
  onLoadMore,
}: {
  items: readonly TimelineItem[]
  hasMore?: boolean
  loading?: boolean
  loadMoreLabel?: string
  onLoadMore?: () => void
}) {
  return (
    <div className="space-y-4">
      <ol className="relative space-y-0">
        {items.map((item, index) => {
          const Icon = item.icon ?? Circle
          const tone = item.tone ?? "neutral"
          const isLast = index === items.length - 1
          return (
            <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border",
                    toneRing[tone]
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                {!isLast && (
                  <span
                    className="bg-border mt-1 w-px flex-1"
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {item.description}
                  </p>
                )}
                <p className="text-muted-foreground mt-1 text-xs">
                  <time dateTime={item.occurredAt}>
                    <bdi>{item.occurredAtLabel}</bdi>
                  </time>
                  {item.actor && <span> · {item.actor}</span>}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
      {hasMore && onLoadMore && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={loading} onClick={onLoadMore}>
            {loading ? "جارٍ التحميل..." : loadMoreLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
