import type { EnrollmentIntakeInput } from "../types/projections"

/**
 * Intake is idempotent on the admission's approval snapshot: the same approved
 * decision can be submitted repeatedly or concurrently and must always resolve to
 * the same student (spec FR-003).
 */
export function intakeIdempotencyKey(input: EnrollmentIntakeInput): string {
  return `approval:${input.approvalSnapshotId}`
}

export interface StudentCodePattern {
  prefix: string
  year: number
  /** Zero-padded width of the sequential part. */
  width: number
}

export const defaultStudentCodePattern: StudentCodePattern = {
  prefix: "STD",
  year: 2026,
  width: 5,
}

export function formatStudentCode(
  pattern: StudentCodePattern,
  sequence: number
): string {
  return `${pattern.prefix}-${pattern.year}-${String(sequence).padStart(pattern.width, "0")}`
}

/**
 * Allocates the next free code. Uniqueness is a service invariant rather than a
 * form rule, because the code is never editable (research R11).
 */
export function allocateStudentCode(
  pattern: StudentCodePattern,
  takenCodes: ReadonlySet<string>,
  startAt = 1
): string {
  let sequence = startAt
  let candidate = formatStudentCode(pattern, sequence)
  while (takenCodes.has(candidate)) {
    sequence += 1
    candidate = formatStudentCode(pattern, sequence)
  }
  return candidate
}

export function parseStudentCodeSequence(
  code: string,
  pattern: StudentCodePattern
): number | undefined {
  const match = new RegExp(`^${pattern.prefix}-(\\d{4})-(\\d+)$`).exec(code)
  if (!match) return undefined
  const sequence = Number(match[2])
  return Number.isNaN(sequence) ? undefined : sequence
}
