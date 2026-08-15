import { describe, expect, it } from "vitest"
import {
  ageInYears,
  guardianPhoneRequired,
  identityEvidenceSatisfied,
  isMinor,
  isPlausibleDateOfBirth,
  isPlausibleGraduationYear,
  isValidNationalId,
  isValidPhone,
} from "@/features/students/utils/student-identity-rules"
import { studentIdentityRules as rules } from "@/features/students/data/students-lookups"

const TODAY = "2026-07-31T00:00:00.000Z"

describe("phone validation", () => {
  it("accepts a correctly formatted number, including with separators", () => {
    expect(isValidPhone("01012345678", rules)).toBe(true)
    expect(isValidPhone("010 1234-5678", rules)).toBe(true)
    expect(isValidPhone("٠١٠١٢٣٤٥٦٧٨", rules)).toBe(true)
  })

  it("rejects wrong length or prefix", () => {
    expect(isValidPhone("0101234567", rules)).toBe(false)
    expect(isValidPhone("02012345678", rules)).toBe(false)
    expect(isValidPhone("", rules)).toBe(false)
  })
})

describe("national identifier validation", () => {
  it("accepts exactly fourteen digits", () => {
    expect(isValidNationalId("30304120101234", rules)).toBe(true)
    expect(isValidNationalId("٣٠٣٠٤١٢٠١٠١٢٣٤", rules)).toBe(true)
  })

  it("rejects wrong length or non-digits", () => {
    expect(isValidNationalId("303041201012", rules)).toBe(false)
    expect(isValidNationalId("3030412010123A", rules)).toBe(false)
  })
})

describe("age and guardian rules", () => {
  it("computes whole years, not calendar-year differences", () => {
    expect(ageInYears("2008-08-01", TODAY)).toBe(17)
    expect(ageInYears("2008-07-31", TODAY)).toBe(18)
  })

  it("treats a student below the configured threshold as a minor", () => {
    expect(isMinor("2010-09-03", rules, TODAY)).toBe(true)
    expect(isMinor("2003-04-12", rules, TODAY)).toBe(false)
  })

  it("requires a guardian phone exactly when the student is a minor", () => {
    expect(guardianPhoneRequired("2010-09-03", rules, TODAY)).toBe(true)
    expect(guardianPhoneRequired("2003-04-12", rules, TODAY)).toBe(false)
  })
})

describe("date of birth plausibility", () => {
  it("rejects future and impossible dates", () => {
    expect(isPlausibleDateOfBirth("2030-01-01", TODAY)).toBe(false)
    expect(isPlausibleDateOfBirth("1850-01-01", TODAY)).toBe(false)
    expect(isPlausibleDateOfBirth("not-a-date", TODAY)).toBe(false)
  })

  it("accepts a realistic date", () => {
    expect(isPlausibleDateOfBirth("2003-04-12", TODAY)).toBe(true)
  })
})

describe("graduation year plausibility", () => {
  it("rejects a future year", () => {
    expect(isPlausibleGraduationYear(2030, "2003-04-12", rules, TODAY)).toBe(
      false
    )
  })

  it("rejects a year implausibly close to the birth year", () => {
    expect(isPlausibleGraduationYear(2010, "2003-04-12", rules, TODAY)).toBe(
      false
    )
  })

  it("accepts a consistent year", () => {
    expect(isPlausibleGraduationYear(2021, "2003-04-12", rules, TODAY)).toBe(
      true
    )
  })

  it("rejects a non-integer year", () => {
    expect(isPlausibleGraduationYear(2021.5, "2003-04-12", rules, TODAY)).toBe(
      false
    )
  })
})

describe("identity evidence", () => {
  it("is satisfied by a national identifier", () => {
    expect(identityEvidenceSatisfied({ nationalId: "30304120101234" })).toBe(
      true
    )
  })

  it("is satisfied by a documented alternative reason", () => {
    expect(
      identityEvidenceSatisfied({
        alternativeIdentityReason: "الرقم القومي قيد الاستخراج",
      })
    ).toBe(true)
  })

  it("is not satisfied by neither, nor by whitespace", () => {
    expect(identityEvidenceSatisfied({})).toBe(false)
    expect(
      identityEvidenceSatisfied({ nationalId: "  ", alternativeIdentityReason: " " })
    ).toBe(false)
  })
})
