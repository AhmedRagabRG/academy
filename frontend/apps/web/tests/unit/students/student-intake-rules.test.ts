import { describe, expect, it } from "vitest"
import {
  allocateStudentCode,
  defaultStudentCodePattern,
  formatStudentCode,
  intakeIdempotencyKey,
  parseStudentCodeSequence,
} from "@/features/students/utils/student-intake-rules"
import type { EnrollmentIntakeInput } from "@/features/students/types/projections"

const input = (approvalSnapshotId: string): EnrollmentIntakeInput => ({
  admissionId: "admission-1",
  admissionReference: "ADM-1",
  admissionVersion: 1,
  approvalSnapshotId,
  applicant: { id: "applicant-1", name: "طالب", phone: "01000000000" },
  academicTarget: {
    kind: "training-course",
    offeringId: "offering-course-excel",
    offeringVersion: 1,
  },
  branches: {
    registrationBranchId: "branch-main",
    studyBranchId: "branch-main",
  },
})

describe("intake idempotency key", () => {
  it("derives from the approval snapshot alone", () => {
    expect(intakeIdempotencyKey(input("snap-1"))).toBe("approval:snap-1")
  })

  it("is stable across repeated derivation", () => {
    expect(intakeIdempotencyKey(input("snap-2"))).toBe(
      intakeIdempotencyKey(input("snap-2"))
    )
  })

  it("differs for different approval snapshots", () => {
    expect(intakeIdempotencyKey(input("snap-a"))).not.toBe(
      intakeIdempotencyKey(input("snap-b"))
    )
  })
})

describe("student code allocation", () => {
  it("formats a zero-padded sequential code", () => {
    expect(formatStudentCode(defaultStudentCodePattern, 7)).toBe(
      "STD-2026-00007"
    )
  })

  it("skips codes already taken", () => {
    const taken = new Set(["STD-2026-00001", "STD-2026-00002"])
    expect(allocateStudentCode(defaultStudentCodePattern, taken)).toBe(
      "STD-2026-00003"
    )
  })

  it("returns the first free code when none are taken", () => {
    expect(allocateStudentCode(defaultStudentCodePattern, new Set())).toBe(
      "STD-2026-00001"
    )
  })

  it("parses the sequence back out of a formatted code", () => {
    expect(
      parseStudentCodeSequence("STD-2026-00042", defaultStudentCodePattern)
    ).toBe(42)
    expect(
      parseStudentCodeSequence("NOT-A-CODE", defaultStudentCodePattern)
    ).toBeUndefined()
  })
})
