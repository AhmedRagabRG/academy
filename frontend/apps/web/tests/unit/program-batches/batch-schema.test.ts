import { describe, expect, it } from "vitest"
import { programBatchSchema } from "@/features/program-batches/schemas/program-batch-schema"
import { validFinancialProfile } from "./test-helpers"
describe("program batch schema", () => {
  it("accepts a valid draft and rejects an invalid schedule", () => {
    const base = {
      name: { ar: "دفعة اختبار" },
      code: "TEST-1",
      academicYearId: "year-2026",
      intakeId: "fall",
      description: "",
      maximumStudents: 10,
      financialProfile: validFinancialProfile,
      branchAssignments: [],
    }
    expect(
      programBatchSchema.safeParse({
        ...base,
        schedule: {
          registrationStartDate: "2026-01-01",
          registrationEndDate: "2026-02-01",
        },
      }).success
    ).toBe(true)
    expect(
      programBatchSchema.safeParse({
        ...base,
        schedule: {
          registrationStartDate: "2026-03-01",
          registrationEndDate: "2026-02-01",
        },
      }).success
    ).toBe(false)
  })
})
