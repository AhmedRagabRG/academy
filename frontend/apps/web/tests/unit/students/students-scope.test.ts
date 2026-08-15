import { describe, expect, it } from "vitest"
import {
  buildScopeFingerprint,
  defaultStudentContext,
  hasStudentPermission,
  isStudentInScope,
  redactSummary,
  type StudentServiceContext,
} from "@/features/students/utils/students-scope"
import { redactPhone } from "@/features/students/utils/student-identity-rules"
import type { Student } from "@/features/students/types/domain"
import type { StudentSummary } from "@/features/students/types/projections"
import type { StudentId } from "@/features/students/types/common"

const student = (
  registrationBranchId: string,
  studyBranchId: string,
  organizationId = "organization-alsalam"
) =>
  ({
    id: "student-1" as StudentId,
    organizationId,
    assignment: { registrationBranchId, studyBranchId },
  }) as Student

const scoped = (branchIds: string[]): StudentServiceContext => ({
  ...defaultStudentContext,
  organizationWide: false,
  authorizedBranchIds: branchIds,
})

describe("branch scope intersection", () => {
  it("admits everything in the organization for organization-wide contexts", () => {
    expect(
      isStudentInScope(student("branch-x", "branch-y"), defaultStudentContext)
    ).toBe(true)
  })

  it("admits a student whose registration branch intersects the scope", () => {
    expect(
      isStudentInScope(student("branch-cairo", "branch-x"), scoped(["branch-cairo"]))
    ).toBe(true)
  })

  it("admits a student whose study branch intersects the scope", () => {
    expect(
      isStudentInScope(student("branch-x", "branch-giza"), scoped(["branch-giza"]))
    ).toBe(true)
  })

  it("rejects a student with no intersecting branch", () => {
    expect(
      isStudentInScope(student("branch-x", "branch-y"), scoped(["branch-cairo"]))
    ).toBe(false)
  })

  it("rejects a student from another organization even when branches match", () => {
    expect(
      isStudentInScope(
        student("branch-cairo", "branch-cairo", "organization-other"),
        scoped(["branch-cairo"])
      )
    ).toBe(false)
  })
})

describe("permission checks", () => {
  it("requires the exact key", () => {
    expect(hasStudentPermission(defaultStudentContext, "students.view")).toBe(
      true
    )
    expect(
      hasStudentPermission(
        { ...defaultStudentContext, permissions: ["students.view"] },
        "students.notes.view"
      )
    ).toBe(false)
  })
})

describe("list projection redaction", () => {
  const summary = { phoneHint: "01012345678" } as StudentSummary

  it("leaves contact values intact for organization-wide contexts", () => {
    expect(redactSummary(summary, defaultStudentContext).phoneHint).toBe(
      "01012345678"
    )
  })

  it("masks all but the last four digits for scoped contexts", () => {
    const redacted = redactSummary(summary, scoped(["branch-cairo"]))
    expect(redacted.phoneHint).toBe("•••••••5678")
    expect(redactPhone("0101")).toBe("0101")
  })
})

describe("scope fingerprint", () => {
  it("is stable regardless of branch and permission ordering", () => {
    const base = {
      ...defaultStudentContext,
      organizationWide: false,
      authorizedBranchIds: ["branch-b", "branch-a"],
      permissions: ["students.view", "students.update"],
    }
    const swapped = {
      ...base,
      authorizedBranchIds: ["branch-a", "branch-b"],
      permissions: ["students.update", "students.view"],
    }
    expect(buildScopeFingerprint(base)).toBe(buildScopeFingerprint(swapped))
  })

  it("differs between organization-wide and scoped contexts", () => {
    expect(buildScopeFingerprint(defaultStudentContext)).not.toBe(
      buildScopeFingerprint({
        ...defaultStudentContext,
        organizationWide: false,
        authorizedBranchIds: ["branch-cairo"],
      })
    )
  })
})
