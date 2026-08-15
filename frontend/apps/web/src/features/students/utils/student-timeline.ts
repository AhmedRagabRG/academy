import type { Cursor, TimelineCategory } from "../types/common"
import type { StudentTimelineEvent } from "../types/domain"
import type { StudentTimelineQuery } from "../types/commands"

/**
 * Newest first, with `sequence` breaking ties on identical timestamps. Keyset
 * paging over `(occurredAt, sequence)` keeps ordering stable while new events are
 * appended, which offset paging cannot (research R7).
 */
export function compareEvents(
  left: StudentTimelineEvent,
  right: StudentTimelineEvent
): number {
  const byTime = right.occurredAt.localeCompare(left.occurredAt)
  return byTime !== 0 ? byTime : right.sequence - left.sequence
}

export function sortTimeline(
  events: readonly StudentTimelineEvent[]
): StudentTimelineEvent[] {
  return [...events].sort(compareEvents)
}

export function mergeTimeline(
  ...sources: readonly StudentTimelineEvent[][]
): StudentTimelineEvent[] {
  const seen = new Set<string>()
  const merged: StudentTimelineEvent[] = []
  for (const source of sources) {
    for (const event of source) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      merged.push(event)
    }
  }
  return sortTimeline(merged)
}

export function encodeCursor(event: StudentTimelineEvent): string {
  return `${event.occurredAt}|${event.sequence}`
}

export function decodeCursor(
  cursor: string
): { occurredAt: string; sequence: number } | undefined {
  const separator = cursor.lastIndexOf("|")
  if (separator < 0) return undefined
  const occurredAt = cursor.slice(0, separator)
  const sequence = Number(cursor.slice(separator + 1))
  if (!occurredAt || Number.isNaN(sequence)) return undefined
  return { occurredAt, sequence }
}

/**
 * True when the event sorts strictly after the cursor position. Ordering is
 * newest-first, so "after" means *older* than the cursor — anything newer belongs
 * on an earlier page and must not reappear.
 */
function isAfterCursor(
  event: StudentTimelineEvent,
  position: { occurredAt: string; sequence: number }
): boolean {
  const byTime = position.occurredAt.localeCompare(event.occurredAt)
  if (byTime !== 0) return byTime > 0
  return event.sequence < position.sequence
}

export function pageTimeline(
  events: readonly StudentTimelineEvent[],
  query: StudentTimelineQuery
): Cursor<StudentTimelineEvent> {
  const limit = Math.max(1, Math.min(query.limit, 100))
  let ordered = sortTimeline(events)
  if (query.categories?.length) {
    const wanted = new Set<TimelineCategory>(query.categories)
    ordered = ordered.filter((event) => wanted.has(event.category))
  }
  if (query.cursor) {
    const position = decodeCursor(query.cursor)
    if (position)
      ordered = ordered.filter((event) => isAfterCursor(event, position))
  }
  const items = ordered.slice(0, limit)
  const hasMore = ordered.length > limit
  const last = items.at(-1)
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last) : undefined,
  }
}

/** Next monotonic sequence for a student's timeline. */
export function nextSequence(
  events: readonly StudentTimelineEvent[]
): number {
  return events.reduce(
    (highest, event) => Math.max(highest, event.sequence),
    0
  ) + 1
}
