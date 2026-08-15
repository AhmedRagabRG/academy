import type { NumberingPolicy } from "../types/domain"

/**
 * Request numbering, from the configured pattern rather than a constant.
 *
 * The pattern is business data: an organization changing its prefix or padding is
 * a configuration change, not a code change (spec FR-011).
 */
export function formatRequestNumber(
  policy: NumberingPolicy,
  sequence: number
): string {
  const padded = String(Math.max(1, Math.trunc(sequence))).padStart(
    Math.max(1, policy.padding),
    "0"
  )
  return [policy.prefix, policy.yearSegment, padded].filter(Boolean).join("-")
}

/** The next sequence for a set of already-issued numbers. */
export function nextRequestSequence(existing: readonly string[]): number {
  const highest = existing.reduce((max, number) => {
    const tail = number.split("-").at(-1)
    const parsed = Number(tail)
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 0)
  return highest + 1
}
