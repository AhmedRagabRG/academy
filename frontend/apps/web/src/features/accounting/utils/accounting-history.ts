import type { HistoryEntry } from "../types/domain"

/**
 * History ordering and sequence allocation.
 *
 * Chronological, oldest first — a request's history reads as a narrative from
 * creation onwards, unlike a notification feed. `sequence` breaks ties on
 * identical timestamps, which is not hypothetical: an injected clock gives every
 * entry written in one test the same instant.
 */
export function compareEntries(left: HistoryEntry, right: HistoryEntry): number {
  const byTime = left.occurredAt.localeCompare(right.occurredAt)
  return byTime !== 0 ? byTime : left.sequence - right.sequence
}

export function sortHistory(entries: readonly HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort(compareEntries)
}

export function nextSequence(entries: readonly HistoryEntry[]): number {
  return entries.reduce((highest, entry) => Math.max(highest, entry.sequence), 0) + 1
}
