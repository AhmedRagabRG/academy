import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { studentWithoutRecordsId } from "@/features/student-finance/data/finance-fixtures"
import { add, subtract, sum, zeroMoney } from "@/shared/utils/money"

const query = { page: 1, pageSize: 200 }

beforeEach(() => resetFinanceStore())

/**
 * SC-001: the profile must never disagree with the records that produced it.
 * These tests recompute every figure independently from the list projections and
 * compare, rather than trusting the derivation to check itself.
 */
describe("profile figures reconcile with the records", () => {
  it("totals equal the sum of that student's non-cancelled invoices", async () => {
    const page = await studentFinanceService.listInvoices(query)
    const studentIds = [...new Set(page.items.map((item) => item.studentId))]

    for (const studentId of studentIds) {
      const profile = await studentFinanceService.getStudentFinancialProfile(studentId)
      const rows = page.items.filter(
        (item) => item.studentId === studentId && item.status !== "cancelled"
      )

      const expectedFees = sum(rows.map((row) => row.finalAmount), "EGP", 2)
      const expectedPaid = sum(rows.map((row) => row.paidAmount), "EGP", 2)
      const expectedRemaining = sum(rows.map((row) => row.remaining), "EGP", 2)

      expect(profile.totals.totalFees.amount).toBe(expectedFees.amount)
      expect(profile.totals.paidAmount.amount).toBe(expectedPaid.amount)
      expect(profile.totals.remainingBalance.amount).toBe(expectedRemaining.amount)
    }
  })

  it("keeps remaining equal to fees minus paid", async () => {
    const page = await studentFinanceService.listInvoices(query)
    for (const studentId of [...new Set(page.items.map((item) => item.studentId))]) {
      const profile = await studentFinanceService.getStudentFinancialProfile(studentId)
      expect(profile.totals.remainingBalance.amount).toBe(
        subtract(profile.totals.totalFees, profile.totals.paidAmount).amount
      )
    }
  })

  it("excludes cancelled invoices from every total", async () => {
    const page = await studentFinanceService.listInvoices(query)
    const cancelled = page.items.find((item) => item.status === "cancelled")!
    const profile = await studentFinanceService.getStudentFinancialProfile(
      cancelled.studentId
    )

    const withCancelled = sum(
      page.items
        .filter((item) => item.studentId === cancelled.studentId)
        .map((item) => item.finalAmount),
      "EGP",
      2
    )
    expect(profile.totals.totalFees.amount).not.toBe(withCancelled.amount)
  })

  it("sums per-enrollment balances back to the student totals", async () => {
    const page = await studentFinanceService.listInvoices(query)
    for (const studentId of [...new Set(page.items.map((item) => item.studentId))]) {
      const profile = await studentFinanceService.getStudentFinancialProfile(studentId)
      const rolled = profile.perEnrollment.reduce(
        (carried, entry) => add(carried, entry.remaining),
        zeroMoney("EGP", 2)
      )
      expect(rolled.amount).toBe(profile.totals.remainingBalance.amount)
    }
  })

  it("reflects a completed refund by increasing the remaining balance", async () => {
    // Fixture student 6 has a payment with a completed refund.
    const page = await studentFinanceService.listInvoices(query)
    const row = page.items.find((item) => item.studentCode === "STD-2026-00006")!
    const invoice = await studentFinanceService.getInvoice(row.id)

    const gross = sum(invoice.payments.map((payment) => payment.amount), "EGP", 2)
    const refunded = sum(
      invoice.refunds
        .filter((refund) => refund.status === "completed")
        .map((refund) => refund.amount),
      "EGP",
      2
    )
    expect(invoice.derived.netPaid.amount).toBe(subtract(gross, refunded).amount)
  })

  it("reflects a post-issuance adjustment in the final amount, not the snapshot", async () => {
    // Fixture student 5 carries a 1000.00 adjustment recorded after issuance.
    const page = await studentFinanceService.listInvoices(query)
    const row = page.items.find((item) => item.studentCode === "STD-2026-00005")!
    const invoice = await studentFinanceService.getInvoice(row.id)

    expect(invoice.adjustments.length).toBeGreaterThan(0)
    const reductions = sum(
      invoice.adjustments.map((adjustment) => adjustment.amount),
      "EGP",
      2
    )
    expect(invoice.derived.finalAmount.amount).toBe(
      subtract(invoice.issuedSnapshot!.finalAmount, reductions).amount
    )
  })
})

describe("a student with no records", () => {
  it("returns explicit zeroes flagged as a fact, not an absence", async () => {
    const profile = await studentFinanceService.getStudentFinancialProfile(
      studentWithoutRecordsId
    )

    expect(profile.hasNoRecords).toBe(true)
    expect(profile.totals.totalFees.amount).toBe("0.00")
    expect(profile.totals.paidAmount.amount).toBe("0.00")
    expect(profile.totals.remainingBalance.amount).toBe("0.00")
    expect(profile.financialStatus).toBe("no-outstanding-balance")
    expect(profile.perEnrollment).toEqual([])
  })

  it("still carries the currency and an as-of time", async () => {
    const profile = await studentFinanceService.getStudentFinancialProfile(
      studentWithoutRecordsId
    )
    expect(profile.currency).toBe("EGP")
    expect(profile.asOf).toBeTruthy()
  })
})

describe("derived financial status", () => {
  it("reports overdue when an issued invoice has passed its due date unpaid", async () => {
    // Fixture student 3: issued 2026-03, due 2026-04, nothing collected.
    financeScenarios.setNow("2026-08-01T12:00:00.000Z")
    const profile = await studentFinanceService.getStudentFinancialProfile(
      "student-STD-2026-00003"
    )
    expect(profile.financialStatus).toBe("overdue")
  })

  it("does not report overdue before the due date passes", async () => {
    financeScenarios.setNow("2026-03-15T12:00:00.000Z")
    const profile = await studentFinanceService.getStudentFinancialProfile(
      "student-STD-2026-00003"
    )
    expect(profile.financialStatus).toBe("partial-balance")
  })

  it("reports no outstanding balance when everything is settled", async () => {
    const profile = await studentFinanceService.getStudentFinancialProfile(
      "student-STD-2026-00001"
    )
    // Fixture student 1's program invoice is fully paid; the second is cancelled.
    expect(profile.totals.remainingBalance.amount).toBe("0.00")
    expect(profile.financialStatus).toBe("no-outstanding-balance")
  })

  it("counts only unpaid installments as outstanding", async () => {
    const profile = await studentFinanceService.getStudentFinancialProfile(
      "student-STD-2026-00001"
    )
    expect(profile.outstandingInstallments).toBe(0)
  })
})

describe("profile scope and permissions", () => {
  it("refuses the profile without finance.view", async () => {
    financeScenarios.withoutPermissions(["finance.view"])
    await expect(
      studentFinanceService.getStudentFinancialProfile("student-STD-2026-00001")
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("excludes out-of-scope invoices from the totals", async () => {
    const full = await studentFinanceService.getStudentFinancialProfile(
      "student-STD-2026-00001"
    )
    financeScenarios.scopeToBranches(["branch-cairo"])
    const scoped = await studentFinanceService.getStudentFinancialProfile(
      "student-STD-2026-00001"
    )
    expect(Number(scoped.totals.totalFees.amount)).toBeLessThanOrEqual(
      Number(full.totals.totalFees.amount)
    )
  })

  it("surfaces a retryable failure rather than zeroes", async () => {
    financeScenarios.failNext("profile")
    await expect(
      studentFinanceService.getStudentFinancialProfile("student-STD-2026-00001")
    ).rejects.toMatchObject({ code: "service-unavailable", retryable: true })
  })
})

describe("no figure is ever negative", () => {
  it("clamps every total at zero across every student", async () => {
    const page = await studentFinanceService.listInvoices(query)
    for (const studentId of [...new Set(page.items.map((item) => item.studentId))]) {
      const profile = await studentFinanceService.getStudentFinancialProfile(studentId)
      for (const value of [
        profile.totals.totalFees,
        profile.totals.paidAmount,
        profile.totals.remainingBalance,
      ])
        expect(Number(value.amount)).toBeGreaterThanOrEqual(0)
    }
  })

  it("keeps every invoice remaining at or above zero", async () => {
    const page = await studentFinanceService.listInvoices(query)
    for (const item of page.items)
      expect(Number(item.remaining.amount)).toBeGreaterThanOrEqual(0)
  })
})
