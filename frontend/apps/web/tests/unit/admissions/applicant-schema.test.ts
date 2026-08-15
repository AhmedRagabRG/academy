import { describe, expect, it } from "vitest"
import { applicantSchema } from "@/features/admissions/schemas/applicant-schema"

const applicant = {
  fullName: "مريم أحمد",
  primaryPhone: "01012345678",
  address: "القاهرة، مصر",
  dateOfBirth: "2000-01-01",
  qualificationId: "qualification-bachelor",
  graduationYear: 2022,
  notes: "",
}

describe("applicant schema", () => {
  it("accepts alternative identity evidence for a draft", () => {
    expect(
      applicantSchema.safeParse({
        ...applicant,
        alternativeIdentityReason: "جواز السفر قيد التجديد",
      }).success
    ).toBe(true)
  })

  it("maps invalid national ID to the authoritative field", () => {
    const result = applicantSchema.safeParse({
      ...applicant,
      nationalId: "123",
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(
        result.error.issues.some((issue) => issue.path.includes("nationalId"))
      ).toBe(true)
  })
})
