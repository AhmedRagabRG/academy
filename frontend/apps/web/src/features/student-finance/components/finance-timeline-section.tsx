"use client"

import { useMemo, useState } from "react"
import { Timeline } from "@/shared/components/data-display/timeline"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { FinanceEventCategory } from "../types/common"
import { timelineCopy } from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import { useFinanceTimeline } from "../hooks/use-finance-timeline"
import { FinanceAreaState } from "./finance-area-states"
import {
  allEventCategories,
  eventCopy,
  toTimelineItem,
} from "./finance-timeline-mapping"

/**
 * The student's financial history.
 *
 * Pages incrementally rather than loading everything: a long-standing student can
 * accumulate hundreds of events, and the first screen is what anyone actually
 * reads.
 */
export function FinanceTimelineSection({ studentId }: { studentId: string }) {
  const [category, setCategory] = useState<FinanceEventCategory | "">("")
  const timeline = useFinanceTimeline(
    studentId,
    category ? [category] : undefined
  )

  const items = useMemo(
    () =>
      (timeline.data?.pages ?? []).flatMap((page) =>
        page.items.map(toTimelineItem)
      ),
    [timeline.data]
  )

  const filtered = category !== ""

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="finance-timeline-category" className="text-sm font-medium">
          {timelineCopy.category}
        </label>
        <select
          id="finance-timeline-category"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as FinanceEventCategory | "")
          }
          className="border-input bg-background focus-visible:ring-ring h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
        >
          <option value="">الكل</option>
          {allEventCategories.map((value) => (
            <option key={value} value={value}>
              {eventCopy[value]}
            </option>
          ))}
        </select>
      </div>

      <FinanceAreaState
        permission={financePermissions.timelineView}
        loading={timeline.isLoading}
        error={timeline.error}
        onRetry={() => void timeline.refetch()}
        loadingLabel="جارٍ تحميل السجل المالي"
      >
        {items.length === 0 ? (
          <EmptyState
            title={timelineCopy.emptyTitle}
            description={
              filtered ? "لا توجد أحداث من هذا النوع." : timelineCopy.emptyDescription
            }
          />
        ) : (
          <Timeline
            items={items}
            hasMore={timeline.hasNextPage}
            loading={timeline.isFetchingNextPage}
            onLoadMore={() => void timeline.fetchNextPage()}
          />
        )}
      </FinanceAreaState>
    </div>
  )
}
