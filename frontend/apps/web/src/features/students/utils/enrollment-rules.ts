import type { OfferingKind } from "../types/common"
import type { StudentEnrollment } from "../types/domain"

/** A Professional Program requires exactly one batch; nothing else may carry one. */
export function requiresBatch(kind: OfferingKind): boolean {
  return kind === "professional-program"
}

export interface EnrollmentTargetShape {
  kind: OfferingKind
  batchId?: string
}

/**
 * The program⇔batch invariant. A violation is an intake error, never a rendered
 * state (spec FR-013).
 */
export function satisfiesBatchRule(target: EnrollmentTargetShape): boolean {
  return requiresBatch(target.kind)
    ? Boolean(target.batchId)
    : !target.batchId
}

export function batchRuleViolation(
  target: EnrollmentTargetShape
): "batch-required" | "batch-forbidden" | undefined {
  if (requiresBatch(target.kind) && !target.batchId) return "batch-required"
  if (!requiresBatch(target.kind) && target.batchId) return "batch-forbidden"
  return undefined
}

/** Display batch text only where the offering kind allows it. */
export function enrollmentBatchLabel(
  enrollment: StudentEnrollment
): string | undefined {
  return requiresBatch(enrollment.offeringKind)
    ? enrollment.batchLabel
    : undefined
}

/** Newest enrollment first, so the list leads with the current engagement. */
export function sortEnrollments(
  enrollments: readonly StudentEnrollment[]
): StudentEnrollment[] {
  return [...enrollments].sort((left, right) =>
    right.enrollmentDate.localeCompare(left.enrollmentDate)
  )
}

/** The offering shown on the list row: the most recent active one, else the newest. */
export function primaryEnrollment(
  enrollments: readonly StudentEnrollment[]
): StudentEnrollment | undefined {
  const sorted = sortEnrollments(enrollments)
  return sorted.find((item) => item.status === "active") ?? sorted[0]
}
