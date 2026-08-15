import { describe, expect, it } from "vitest"
import { studentsService } from "@/features/students/services/mock-students-service"

/**
 * The module's central prohibition: students cannot be created by hand and cannot
 * be deleted (spec FR-001). Enrollments are display-only (FR-014) and no financial
 * action exists here (FR-026). This test guards the service surface itself, so a
 * future contributor cannot quietly add one of these operations.
 */
describe("students service surface", () => {
  const surface = Object.keys(studentsService)

  it("exposes no create-by-hand operation", () => {
    const creators = surface.filter((name) =>
      /^(create|add|register|new)/i.test(name)
    )
    // addNote is the only permitted "add": it appends a note, not a student.
    expect(creators).toEqual(["addNote"])
    expect(surface).not.toContain("createStudent")
    expect(surface).not.toContain("create")
  })

  it("exposes no delete operation at any level", () => {
    const destructive = surface.filter((name) =>
      /(delete|destroy|remove|purge)/i.test(name)
    )
    expect(destructive).toEqual([])
  })

  it("exposes no enrollment command", () => {
    const enrollmentWrites = surface.filter(
      (name) => /enrollment/i.test(name) && !/^list/.test(name)
    )
    expect(enrollmentWrites).toEqual([])
    expect(surface).toContain("listEnrollments")
  })

  it("exposes no financial action", () => {
    const financialActions = surface.filter((name) =>
      /(pay|payment|refund|invoice|installment|adjust|charge)/i.test(name)
    )
    expect(financialActions).toEqual([])
    expect(surface).toContain("getFinancialSummary")
  })
})
