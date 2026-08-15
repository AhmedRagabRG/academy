import { describe, expect, it } from "vitest"
import {
  batchRuleViolation,
  enrollmentBatchLabel,
  primaryEnrollment,
  requiresBatch,
  satisfiesBatchRule,
  sortEnrollments,
} from "@/features/students/utils/enrollment-rules"
import type { StudentEnrollment } from "@/features/students/types/domain"
import type { StudentEnrollmentId } from "@/features/students/types/common"

const enrollment = (
  overrides: Partial<StudentEnrollment> = {}
): StudentEnrollment =>
  ({
    id: "enrollment-1" as StudentEnrollmentId,
    offeringKind: "training-course",
    offeringLabel: "دورة",
    enrollmentDate: "2026-01-01T00:00:00.000Z",
    status: "active",
    ...overrides,
  }) as StudentEnrollment

describe("program to batch invariant", () => {
  it("requires a batch only for professional programs", () => {
    expect(requiresBatch("professional-program")).toBe(true)
    expect(requiresBatch("professional-diploma")).toBe(false)
    expect(requiresBatch("training-course")).toBe(false)
  })

  it("accepts a program carrying a batch", () => {
    expect(
      satisfiesBatchRule({ kind: "professional-program", batchId: "batch-1" })
    ).toBe(true)
  })

  it("rejects a program without a batch", () => {
    expect(satisfiesBatchRule({ kind: "professional-program" })).toBe(false)
    expect(batchRuleViolation({ kind: "professional-program" })).toBe(
      "batch-required"
    )
  })

  it("rejects a diploma or course carrying a batch", () => {
    expect(
      batchRuleViolation({ kind: "professional-diploma", batchId: "batch-1" })
    ).toBe("batch-forbidden")
    expect(
      batchRuleViolation({ kind: "training-course", batchId: "batch-1" })
    ).toBe("batch-forbidden")
  })

  it("accepts a diploma or course without a batch", () => {
    expect(batchRuleViolation({ kind: "professional-diploma" })).toBeUndefined()
    expect(batchRuleViolation({ kind: "training-course" })).toBeUndefined()
  })
})

describe("enrollment display", () => {
  it("shows a batch label only where the offering kind allows one", () => {
    expect(
      enrollmentBatchLabel(
        enrollment({
          offeringKind: "professional-program",
          batchLabel: "دفعة يناير",
        })
      )
    ).toBe("دفعة يناير")

    // A stale batch label on a course must never leak into the UI.
    expect(
      enrollmentBatchLabel(
        enrollment({ offeringKind: "training-course", batchLabel: "دفعة يناير" })
      )
    ).toBeUndefined()
  })

  it("keeps historically recorded labels after the catalog changes", () => {
    const historical = enrollment({
      offeringLabel: "دورة مؤرشفة (بيانات تاريخية)",
      offeringVersionAtEnrollment: 1,
    })
    expect(historical.offeringLabel).toBe("دورة مؤرشفة (بيانات تاريخية)")
  })

  it("sorts newest first", () => {
    const sorted = sortEnrollments([
      enrollment({ id: "a" as StudentEnrollmentId, enrollmentDate: "2026-01-01T00:00:00.000Z" }),
      enrollment({ id: "b" as StudentEnrollmentId, enrollmentDate: "2026-06-01T00:00:00.000Z" }),
    ])
    expect(sorted[0]?.id).toBe("b")
  })

  it("prefers the most recent active enrollment as the primary one", () => {
    const primary = primaryEnrollment([
      enrollment({
        id: "old-active" as StudentEnrollmentId,
        status: "active",
        enrollmentDate: "2026-01-01T00:00:00.000Z",
      }),
      enrollment({
        id: "new-completed" as StudentEnrollmentId,
        status: "completed",
        enrollmentDate: "2026-06-01T00:00:00.000Z",
      }),
    ])
    expect(primary?.id).toBe("old-active")
  })

  it("falls back to the newest enrollment when none is active", () => {
    const primary = primaryEnrollment([
      enrollment({
        id: "old" as StudentEnrollmentId,
        status: "completed",
        enrollmentDate: "2026-01-01T00:00:00.000Z",
      }),
      enrollment({
        id: "new" as StudentEnrollmentId,
        status: "withdrawn",
        enrollmentDate: "2026-06-01T00:00:00.000Z",
      }),
    ])
    expect(primary?.id).toBe("new")
  })

  it("returns nothing for a student with no enrollments", () => {
    expect(primaryEnrollment([])).toBeUndefined()
  })
})
