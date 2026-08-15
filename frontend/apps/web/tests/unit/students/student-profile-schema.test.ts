import { describe, expect, it } from "vitest"
import { createStudentProfileSchema } from "@/features/students/schemas/student-profile-schema"
import { studentIdentityRules } from "@/features/students/data/students-lookups"
import type { StudentProfileInput } from "@/features/students/types/commands"

const TODAY = "2026-07-31T00:00:00.000Z"
const schema = createStudentProfileSchema(studentIdentityRules, TODAY)

const valid = (
  overrides: Partial<StudentProfileInput["identity"]> = {}
): StudentProfileInput => ({
  identity: {
    fullName: "يوسف عبد الرحمن",
    primaryPhone: "01012345678",
    nationalId: "30304120101234",
    address: "القاهرة، جمهورية مصر العربية",
    dateOfBirth: "2003-04-12",
    qualificationId: "qualification-highschool",
    qualificationLabel: "الثانوية العامة",
    graduationYear: 2021,
    ...overrides,
  },
  assignment: {
    registrationBranchId: "branch-main",
    registrationBranchLabel: "الفرع الرئيسي",
    studyBranchId: "branch-main",
    studyBranchLabel: "الفرع الرئيسي",
    departmentId: "department-it",
    departmentLabel: "تقنية المعلومات",
    customerServiceEmployeeId: "employee-demo",
    customerServiceEmployeeName: "أحمد محمد",
  },
})

const errorPaths = (input: unknown): string[] => {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."))
}

describe("student profile schema", () => {
  it("accepts a valid profile", () => {
    expect(schema.safeParse(valid()).success).toBe(true)
  })

  it("refuses a short name", () => {
    expect(errorPaths(valid({ fullName: "ab" }))).toContain("identity.fullName")
  })

  it("refuses a malformed phone", () => {
    expect(errorPaths(valid({ primaryPhone: "12345" }))).toContain(
      "identity.primaryPhone"
    )
  })

  it("refuses a malformed national identifier", () => {
    expect(errorPaths(valid({ nationalId: "12345" }))).toContain(
      "identity.nationalId"
    )
  })

  it("requires an alternative reason when the national identifier is absent", () => {
    expect(errorPaths(valid({ nationalId: undefined }))).toContain(
      "identity.alternativeIdentityReason"
    )
  })

  it("accepts an absent national identifier with a documented reason", () => {
    expect(
      schema.safeParse(
        valid({
          nationalId: undefined,
          alternativeIdentityReason: "الرقم القومي قيد الاستخراج",
        })
      ).success
    ).toBe(true)
  })

  it("requires a guardian phone for a minor", () => {
    expect(
      errorPaths(
        valid({
          dateOfBirth: "2010-09-03",
          graduationYear: 2026,
          nationalId: "31009030201234",
        })
      )
    ).toContain("identity.guardianPhone")
  })

  it("accepts a minor carrying a guardian phone", () => {
    expect(
      schema.safeParse(
        valid({
          dateOfBirth: "2010-09-03",
          graduationYear: 2026,
          guardianPhone: "01098765432",
          nationalId: "31009030201234",
        })
      ).success
    ).toBe(true)
  })

  it("refuses a future date of birth", () => {
    expect(errorPaths(valid({ dateOfBirth: "2030-01-01" }))).toContain(
      "identity.dateOfBirth"
    )
  })

  it("refuses a graduation year inconsistent with the birth date", () => {
    expect(errorPaths(valid({ graduationYear: 2005 }))).toContain(
      "identity.graduationYear"
    )
  })

  it("refuses a future graduation year", () => {
    expect(errorPaths(valid({ graduationYear: 2030 }))).toContain(
      "identity.graduationYear"
    )
  })

  it("refuses an empty address and a missing qualification", () => {
    const paths = errorPaths(valid({ address: "", qualificationId: "" }))
    expect(paths).toContain("identity.address")
    expect(paths).toContain("identity.qualificationId")
  })

  it("refuses missing assignment values", () => {
    const input = valid()
    const paths = errorPaths({
      ...input,
      assignment: { ...input.assignment, registrationBranchId: "", departmentId: "" },
    })
    expect(paths).toContain("assignment.registrationBranchId")
    expect(paths).toContain("assignment.departmentId")
  })

  it("reports every invalid field at once, not just the first", () => {
    const paths = errorPaths(
      valid({ fullName: "x", primaryPhone: "1", nationalId: "2" })
    )
    expect(paths.length).toBeGreaterThanOrEqual(3)
  })

  it("carries no student code, admission reference, or dates in its shape", () => {
    const parsed = schema.parse(valid())
    expect(parsed).not.toHaveProperty("studentCode")
    expect(parsed).not.toHaveProperty("system")
  })
})
