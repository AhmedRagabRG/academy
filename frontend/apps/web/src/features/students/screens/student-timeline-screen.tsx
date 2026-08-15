"use client"

import { useMemo } from "react"
import {
  Timeline,
  type TimelineItem,
} from "@/shared/components/data-display/timeline"
import type { StudentId } from "../types/common"
import { studentsPermissions } from "../config/students-permissions"
import { timelineCopy } from "../config/students-copy"
import { formatDateTime } from "../utils/student-format"
import { useStudentTimeline } from "../hooks/use-student-timeline"
import { StudentAreaState } from "../components/student-area-states"
import { timelineCategoryPresentation } from "../components/student-timeline-mapping"

export function StudentTimelineScreen({ studentId }: { studentId: string }) {
  const timeline = useStudentTimeline(studentId as StudentId)

  const items = useMemo<TimelineItem[]>(
    () =>
      (timeline.data?.pages ?? []).flatMap((page) =>
        page.items.map((event) => {
          const presentation = timelineCategoryPresentation[event.category]
          return {
            id: event.id,
            occurredAt: event.occurredAt,
            occurredAtLabel: formatDateTime(event.occurredAt),
            title: presentation.label,
            description: event.summary,
            actor: event.actor.name,
            icon: presentation.icon,
            tone: presentation.tone,
          }
        })
      ),
    [timeline.data]
  )

  return (
    <StudentAreaState
      permission={studentsPermissions.timelineView}
      loading={timeline.isLoading}
      error={timeline.error}
      onRetry={() => void timeline.refetch()}
      isEmpty={items.length === 0}
      emptyTitle={timelineCopy.empty}
      loadingLabel="جارٍ تحميل السجل الزمني"
    >
      <Timeline
        items={items}
        hasMore={timeline.hasNextPage}
        loading={timeline.isFetchingNextPage}
        onLoadMore={() => void timeline.fetchNextPage()}
      />
    </StudentAreaState>
  )
}
