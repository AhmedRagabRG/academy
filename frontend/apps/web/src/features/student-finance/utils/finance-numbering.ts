import type { NumberingPolicy } from "../types/domain"

/**
 * Invoice and receipt numbers are allocated by the service and are never
 * user-editable (spec FR-004). Allocation goes through a reservation so two
 * concurrent requests cannot receive the same number.
 */

export function formatNumber(
  prefix: string,
  policy: Pick<NumberingPolicy, "year" | "width">,
  sequence: number
): string {
  return `${prefix}-${policy.year}-${String(sequence).padStart(policy.width, "0")}`
}

export function formatInvoiceNumber(
  policy: NumberingPolicy,
  sequence: number
): string {
  return formatNumber(policy.invoicePrefix, policy, sequence)
}

export function formatReceiptNumber(
  policy: NumberingPolicy,
  sequence: number
): string {
  return formatNumber(policy.receiptPrefix, policy, sequence)
}

/** Returns the first free number at or after `startAt`. */
export function allocateNumber(
  prefix: string,
  policy: NumberingPolicy,
  taken: ReadonlySet<string>,
  startAt = 1
): string {
  let sequence = Math.max(1, startAt)
  let candidate = formatNumber(prefix, policy, sequence)
  while (taken.has(candidate)) {
    sequence += 1
    candidate = formatNumber(prefix, policy, sequence)
  }
  return candidate
}

export function parseSequence(
  value: string,
  prefix: string,
  policy: NumberingPolicy
): number | undefined {
  const match = new RegExp(`^${prefix}-${policy.year}-(\\d+)$`).exec(value)
  if (!match) return undefined
  const sequence = Number(match[1])
  return Number.isNaN(sequence) ? undefined : sequence
}

/**
 * A reservation-backed allocator. Numbers are reserved synchronously before any
 * asynchronous work, so interleaved commands cannot collide.
 */
export function createNumberAllocator(policy: NumberingPolicy) {
  const reserved = new Set<string>()

  const allocate = (prefix: string, existing: ReadonlySet<string>): string => {
    const taken = new Set([...existing, ...reserved])
    const next = allocateNumber(prefix, policy, taken, taken.size + 1)
    reserved.add(next)
    return next
  }

  return {
    allocateInvoiceNumber: (existing: ReadonlySet<string>) =>
      allocate(policy.invoicePrefix, existing),
    allocateReceiptNumber: (existing: ReadonlySet<string>) =>
      allocate(policy.receiptPrefix, existing),
    /** Releases a reservation when a command fails before persisting. */
    release: (value: string) => reserved.delete(value),
    reset: () => reserved.clear(),
  }
}
