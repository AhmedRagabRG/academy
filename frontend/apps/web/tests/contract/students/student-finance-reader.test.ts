import { beforeEach, describe, expect, it } from "vitest"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import { studentScenarios } from "@/features/students/services/mock-scenario-controller"
import { defaultStudentFinanceReader } from "@/features/students/services/mock-student-finance-reader"
import type { StudentId } from "@/features/students/types/common"

async function firstStudentId(): Promise<StudentId> {
  const page = await studentsService.list({ page: 1, pageSize: 10 })
  return page.items[0]!.id
}

describe("student finance reader", () => {
  beforeEach(() => resetStudentStore())

  it("defaults to unavailable because Student Finance does not exist yet", async () => {
    const result = await defaultStudentFinanceReader.getFinancialSummary(
      "student-1" as StudentId
    )
    expect(result).toEqual({
      state: "unavailable",
      reason: "finance-module-absent",
    })
  })

  it("never represents absence as zero", async () => {
    const result = await studentsService.getFinancialSummary(
      await firstStudentId()
    )
    expect(result.state).toBe("unavailable")
    expect(result).not.toHaveProperty("summary")
  })

  it("returns figures only in the available state", async () => {
    studentScenarios.setFinance("available")
    const result = await studentsService.getFinancialSummary(
      await firstStudentId()
    )

    expect(result.state).toBe("available")
    if (result.state !== "available") throw new Error("expected available")
    expect(Number(result.summary.totalFees.amount)).toBeGreaterThan(0)
    expect(result.summary.totalFees.currency).toBe("EGP")
    expect(result.summary.totalFees.precision).toBe(2)
    expect(result.summary.asOf).toBeTruthy()
  })

  it("keeps totals consistent to the configured precision", async () => {
    studentScenarios.setFinance("available")
    const result = await studentsService.getFinancialSummary(
      await firstStudentId()
    )
    if (result.state !== "available") throw new Error("expected available")

    const total = Number(result.summary.totalFees.amount)
    const paid = Number(result.summary.paidAmount.amount)
    const remaining = Number(result.summary.remainingBalance.amount)
    expect(paid + remaining).toBeCloseTo(total, 2)
    expect(remaining).toBeGreaterThanOrEqual(0)
  })

  it("distinguishes a source error from a timeout and from an absent module", async () => {
    const studentId = await firstStudentId()

    studentScenarios.setFinance("source-error")
    expect(await studentsService.getFinancialSummary(studentId)).toEqual({
      state: "unavailable",
      reason: "source-error",
    })

    studentScenarios.setFinance("timeout")
    expect(await studentsService.getFinancialSummary(studentId)).toEqual({
      state: "unavailable",
      reason: "timeout",
    })
  })

  it("returns forbidden rather than unavailable without students.finance.view", async () => {
    const studentId = await firstStudentId()
    studentScenarios.setFinance("available")
    studentScenarios.withoutPermissions(["students.finance.view"])

    expect(await studentsService.getFinancialSummary(studentId)).toEqual({
      state: "forbidden",
    })
  })

  it("is deterministic for the same student", async () => {
    studentScenarios.setFinance("available")
    const studentId = await firstStudentId()
    const first = await studentsService.getFinancialSummary(studentId)
    const second = await studentsService.getFinancialSummary(studentId)
    expect(first).toEqual(second)
  })
})

describe("context summary", () => {
  beforeEach(() => resetStudentStore())

  it("carries identity, status, assignment, enrollments, documents, and admission reference", async () => {
    const studentId = await firstStudentId()
    const summary = await studentsService.getContextSummary(studentId)

    expect(summary.studentCode).toBeTruthy()
    expect(summary.status).toBeTruthy()
    expect(summary.assignment.registrationBranchId).toBeTruthy()
    expect(summary.admissionRef.approvalSnapshotId).toBeTruthy()
    expect(summary.documentCompletion.requiredTypes).toBeGreaterThan(0)
    expect(Array.isArray(summary.enrollmentTargets)).toBe(true)
  })

  it("carries the financial summary state without leaking figures", async () => {
    const summary = await studentsService.getContextSummary(
      await firstStudentId()
    )
    expect(summary.financialSummaryRef?.state).toBe("unavailable")
    expect(JSON.stringify(summary)).not.toContain("totalFees")
  })

  it("never carries addresses, identifiers, note content, or document files", async () => {
    const summary = await studentsService.getContextSummary(
      await firstStudentId()
    )
    const serialized = JSON.stringify(summary)

    expect(summary).not.toHaveProperty("identity")
    expect(serialized).not.toContain("nationalId")
    expect(serialized).not.toContain("address")
    expect(serialized).not.toContain("previewUrl")
  })

  it("refuses an out-of-scope student exactly as interactive reads do", async () => {
    const page = await studentsService.list({ page: 1, pageSize: 50 })
    const alexOnly = page.items.find((item) =>
      item.registrationBranchLabel.includes("الإسكندرية")
    )!
    studentScenarios.scopeToBranches(["branch-cairo"])

    await expect(
      studentsService.getContextSummary(alexOnly.id)
    ).rejects.toMatchObject({ code: "out-of-scope" })
  })
})
