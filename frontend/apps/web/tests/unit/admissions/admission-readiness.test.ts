import { describe, expect, it } from "vitest"
import {
  seededAdmissions,
  seededApplicants,
} from "@/features/admissions/data/admissions-fixtures"
import { getAdmissionReadiness } from "@/features/admissions/utils/admission-readiness"
import { buildEnrollmentReadiness } from "@/features/admissions/utils/admission-snapshots"

describe("admission readiness", () => {
  it("blocks submission when academic and financial preparation are missing", () => {
    const result = getAdmissionReadiness(seededAdmissions[0]!, "submit")
    expect(result.ready).toBe(false)
    expect(result.findings.map((item) => item.section)).toEqual(
      expect.arrayContaining(["academic", "finance"])
    )
  })

  it("does not expose enrollment readiness for non-approved admissions", () => {
    const result = buildEnrollmentReadiness(
      seededAdmissions[0]!,
      seededApplicants[0]!
    )
    expect(result.ready).toBe(false)
    expect("documents" in result).toBe(false)
    expect("notes" in result).toBe(false)
  })
})
