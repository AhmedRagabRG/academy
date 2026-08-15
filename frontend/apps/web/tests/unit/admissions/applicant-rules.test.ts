import { describe, expect, it } from "vitest"
import {
  applicantRuleErrors,
  normalizeArabicText,
  normalizePhone,
} from "@/features/admissions/utils/applicant-rules"

const valid = {
  fullName: "أحمد علي",
  primaryPhone: "+20 100 123 4567",
  nationalId: "30001011234567",
  address: "القاهرة",
  dateOfBirth: "2000-01-01",
  qualificationId: "bachelor",
  graduationYear: 2022,
  notes: "",
}

describe("applicant rules", () => {
  it("normalizes Arabic identity and phone values", () => {
    expect(normalizeArabicText("  أحمد   على ")).toBe("احمد علي")
    expect(normalizePhone("+20 (100) 123-4567")).toBe("201001234567")
  })

  it("requires a guardian for a minor", () => {
    const errors = applicantRuleErrors(
      { ...valid, dateOfBirth: "2010-01-01" },
      new Date("2026-07-31T00:00:00Z")
    )
    expect(errors.guardianPhone).toBeTruthy()
  })

  it("requires alternative identity evidence when national ID is absent", () => {
    const errors = applicantRuleErrors({ ...valid, nationalId: undefined })
    expect(errors.alternativeIdentityReason).toBeTruthy()
  })
})
