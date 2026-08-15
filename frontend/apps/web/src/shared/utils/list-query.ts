/**
 * List-query primitives shared across feature modules.
 *
 * These began life inside Student Finance. They were promoted here when
 * Accounting needed identical semantics, because the inclusive-day rule in
 * `isWithinRange` exists to fix a real off-by-one that dropped rows from the last
 * day of every range — and a second independent copy is a second place for that
 * bug to reappear.
 *
 * Student Finance re-exports these, so its public surface is unchanged.
 */

export interface DateRange {
  from?: string
  to?: string
}

export const MAX_PAGE_SIZE = 100

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g

export function normalizeDigits(value: string): string {
  return value.replace(ARABIC_INDIC_DIGITS, (digit) => {
    const code = digit.charCodeAt(0)
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660
    return String(code - base)
  })
}

export function normalizeArabic(value: string): string {
  return normalizeDigits(value)
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ً-ْـ]/g, "")
}

export function normalizeSearchTerm(value: string): string {
  return normalizeArabic(value).trim().replace(/\s+/g, " ").toLowerCase()
}

/**
 * A range is inverted when `from` is strictly after `to`.
 *
 * Generic over the range shape so a caller may pass a richer object — Student
 * Finance's ranges carry the field they apply to — without an excess-property
 * error at every call site.
 */
export function isInvertedRange<R extends DateRange>(range?: R): boolean {
  if (!range?.from || !range.to) return false
  return new Date(range.from).getTime() > new Date(range.to).getTime()
}

const DAY_MS = 24 * 60 * 60 * 1000
const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

/**
 * Inclusive on both ends. A missing bound is open-ended.
 *
 * A date-only bound names a **day**, not the instant of its midnight. Comparing a
 * record created at 09:00 against a `to` of that same date would otherwise exclude
 * it — an off-by-one that quietly drops real rows from a queue, which is the kind
 * of error nobody notices until a reconciliation disagrees by one day.
 */
export function isWithinRange<R extends DateRange>(
  value: string,
  range?: R
): boolean {
  if (!range) return true
  const at = new Date(value).getTime()
  if (Number.isNaN(at)) return false
  if (range.from && at < new Date(range.from).getTime()) return false
  if (range.to) {
    const to = new Date(range.to).getTime()
    // A date-only upper bound extends to the very end of that day.
    const ceiling = isDateOnly(range.to) ? to + DAY_MS - 1 : to
    if (at > ceiling) return false
  }
  return true
}

/** Drops a range that constrains nothing, so it never becomes a cache-key difference. */
export function normalizeRange<T extends DateRange>(range?: T): T | undefined {
  if (!range) return undefined
  if (!range.from && !range.to) return undefined
  return range
}

/** Stable serialization for cache keys. Key order never affects the result. */
export function serializeQuery(query: object): string {
  return JSON.stringify(query, Object.keys(query).sort())
}

/** Clamps a now-invalid page into range rather than discarding the filters. */
export function clampPage(page: number, pageSize: number, total: number): number {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  return Math.min(Math.max(1, page), totalPages)
}

export function clampPaging(
  page: number,
  pageSize: number,
  fallbackSize: number
): { page: number; pageSize: number } {
  return {
    page: Math.max(1, Math.trunc(page) || 1),
    pageSize: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.trunc(pageSize) || fallbackSize)
    ),
  }
}

/** De-duplicates and sorts an id filter, so order never causes a cache miss. */
export function normalizeIds(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined
  const unique = [...new Set(values.filter(Boolean))].sort()
  return unique.length ? unique : undefined
}
