import type { Cursor, FinanceEventCategory } from "../types/common"
import type { FinanceTimelineQuery } from "../types/commands"
import type { FinanceTimelineEvent } from "../types/domain"

/**
 * Newest first, with `sequence` breaking ties on identical timestamps. Keyset
 * paging over `(occurredAt, sequence)` keeps ordering stable while new events are
 * appended, which offset paging cannot (spec FR-035).
 */
export function compareEvents(
  left: FinanceTimelineEvent,
  right: FinanceTimelineEvent
): number {
  const byTime = right.occurredAt.localeCompare(left.occurredAt)
  return byTime !== 0 ? byTime : right.sequence - left.sequence
}

export function sortTimeline(
  events: readonly FinanceTimelineEvent[]
): FinanceTimelineEvent[] {
  return [...events].sort(compareEvents)
}

export function encodeCursor(event: FinanceTimelineEvent): string {
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
 * True when the event sorts strictly after the cursor. Ordering is newest-first,
 * so "after" means *older* — anything newer belongs on an earlier page and must
 * not reappear.
 */
function isAfterCursor(
  event: FinanceTimelineEvent,
  position: { occurredAt: string; sequence: number }
): boolean {
  const byTime = position.occurredAt.localeCompare(event.occurredAt)
  if (byTime !== 0) return byTime > 0
  return event.sequence < position.sequence
}

export function pageTimeline(
  events: readonly FinanceTimelineEvent[],
  query: FinanceTimelineQuery
): Cursor<FinanceTimelineEvent> {
  const limit = Math.max(1, Math.min(query.limit, 100))
  let ordered = sortTimeline(events)

  if (query.categories?.length) {
    const wanted = new Set<FinanceEventCategory>(query.categories)
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
  return { items, nextCursor: hasMore && last ? encodeCursor(last) : undefined }
}

export function nextSequence(
  events: readonly FinanceTimelineEvent[]
): number {
  return events.reduce((highest, event) => Math.max(highest, event.sequence), 0) + 1
}
