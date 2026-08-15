"use client"

import { useMemo } from "react"
import { Timeline } from "@/shared/components/data-display/timeline"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { HistoryEntry } from "../types/domain"
import { historyCopy } from "../config/accounting-copy"
import { toTimelineItem } from "./history-mapping"

/**
 * The request's approval history, oldest first.
 *
 * Chronological rather than newest-first: a request's history is a narrative from
 * creation onwards, unlike a notification feed. The immutability notice is stated
 * because a reader needs to know the record cannot have been edited for it to be
 * worth anything.
 */
export function ApprovalTimeline({
  history,
}: {
  history: readonly HistoryEntry[]
}) {
  const items = useMemo(() => history.map(toTimelineItem), [history])

  if (items.length === 0) return <EmptyState title={historyCopy.emptyTitle} />

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{historyCopy.immutableNotice}</p>
      <Timeline items={items} />
    </div>
  )
}
