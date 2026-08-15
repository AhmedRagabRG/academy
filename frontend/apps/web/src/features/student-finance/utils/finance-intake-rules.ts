/**
 * Invoicing is idempotent on `(enrollmentId, purpose)`: raising invoices for the
 * same enrollment twice, or concurrently, must reuse the existing invoices rather
 * than duplicating an obligation (spec FR-006).
 */

/** The default purposes an enrollment produces when none are specified. */
export const defaultInvoicePurposes = ["tuition"] as const

export type InvoicePurpose = string

export function intakeIdempotencyKey(
  enrollmentId: string,
  purpose: InvoicePurpose
): string {
  return `enrollment:${enrollmentId}:purpose:${purpose}`
}

export function intakeKeysFor(
  enrollmentId: string,
  purposes: readonly InvoicePurpose[] = defaultInvoicePurposes
): string[] {
  return purposes.map((purpose) => intakeIdempotencyKey(enrollmentId, purpose))
}

/** Splits requested purposes into those already invoiced and those still to raise. */
export function partitionPurposes(
  enrollmentId: string,
  purposes: readonly InvoicePurpose[],
  index: ReadonlyMap<string, unknown>
): { existing: InvoicePurpose[]; missing: InvoicePurpose[] } {
  const existing: InvoicePurpose[] = []
  const missing: InvoicePurpose[] = []
  for (const purpose of purposes) {
    if (index.has(intakeIdempotencyKey(enrollmentId, purpose))) existing.push(purpose)
    else missing.push(purpose)
  }
  return { existing, missing }
}
