import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { studentFinanceReaderAdapter } from "@/features/student-finance/services/student-finance-reader-adapter"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { studentKeys, type StudentId } from "@/features/students"
import {
  invalidationTargets,
  studentFinancialSummaryKey,
} from "@/features/student-finance/services/finance-query-keys"

beforeEach(() => resetFinanceStore())
afterEach(() => financeScenarios.reset())

const read = (studentId: string) =>
  studentFinanceReaderAdapter.getFinancialSummary(studentId as StudentId)

/** Has invoices, payments, and installments. */
const WITH_RECORDS = "student-STD-2026-00002"
/** Exists in Student Management but has no financial records here. */
const WITHOUT_RECORDS = "student-with-no-finance-records"

describe("the reader reports this module's own figures", () => {
  it("returns figures equal to the financial profile", async () => {
    const profile =
      await studentFinanceService.getStudentFinancialProfile(WITH_RECORDS)
    const result = await read(WITH_RECORDS)

    expect(result.state).toBe("available")
    if (result.state !== "available") return
    expect(result.summary.totalFees.amount).toBe(profile.totals.totalFees.amount)
    expect(result.summary.paidAmount.amount).toBe(profile.totals.paidAmount.amount)
    expect(result.summary.remainingBalance.amount).toBe(
      profile.totals.remainingBalance.amount
    )
    expect(result.summary.activeInstallments).toBe(profile.outstandingInstallments)
  })

  it("keeps reporting figures that match after a payment moves the balance", async () => {
    const page = await studentFinanceService.listInvoices({
      page: 1,
      pageSize: 200,
      studentIds: [WITH_RECORDS],
    })
    const invoice = await studentFinanceService.getInvoice(page.items[0]!.id)
    const lookups = await studentFinanceService.lookups()

    await studentFinanceService.recordPayment({
      invoiceId: invoice.id,
      methodId: lookups.paymentMethods.find((method) => method.active)!.id,
      amount: "100.00",
      paymentDate: "2026-08-01",
      expectedVersion: invoice.version,
    })

    const profile =
      await studentFinanceService.getStudentFinancialProfile(WITH_RECORDS)
    const result = await read(WITH_RECORDS)
    if (result.state !== "available") throw new Error("expected figures")
    // The two surfaces derive from the same records, so they cannot disagree.
    expect(result.summary.remainingBalance.amount).toBe(
      profile.totals.remainingBalance.amount
    )
  })

  it("carries the same currency and precision as the module's money", async () => {
    const result = await read(WITH_RECORDS)
    if (result.state !== "available") throw new Error("expected figures")
    expect(result.summary.totalFees.currency).toBe("EGP")
    expect(result.summary.totalFees.precision).toBe(2)
  })

  it("carries an as-of time", async () => {
    const result = await read(WITH_RECORDS)
    if (result.state !== "available") throw new Error("expected figures")
    expect(Number.isNaN(new Date(result.summary.asOf).getTime())).toBe(false)
  })
})

/**
 * Spec FR-027: a student who genuinely owes nothing is not the same as a source
 * that cannot answer. Collapsing the two would either invent a debt-free student
 * or hide a real outage.
 */
describe("zero is not the same as unavailable", () => {
  it("reports available with zero figures for a student with no records", async () => {
    const result = await read(WITHOUT_RECORDS)

    expect(result.state).toBe("available")
    if (result.state !== "available") return
    expect(result.summary.totalFees.amount).toBe("0.00")
    expect(result.summary.paidAmount.amount).toBe("0.00")
    expect(result.summary.remainingBalance.amount).toBe("0.00")
    expect(result.summary.activeInstallments).toBe(0)
  })

  it("never reports unavailable merely because the figures are zero", async () => {
    const result = await read(WITHOUT_RECORDS)
    expect(result.state).not.toBe("unavailable")
  })

  it("distinguishes the two in the same run", async () => {
    const populated = await read(WITH_RECORDS)
    const empty = await read(WITHOUT_RECORDS)
    expect(populated.state).toBe("available")
    expect(empty.state).toBe("available")
    if (populated.state !== "available" || empty.state !== "available") return
    expect(Number(populated.summary.totalFees.amount)).toBeGreaterThan(0)
    expect(Number(empty.summary.totalFees.amount)).toBe(0)
  })
})

/**
 * Student Finance constructs Student Management's financial-summary key from a
 * literal rather than importing its key factory, because importing it would put a
 * compile-time dependency where the architecture forbids one. A duplicated
 * literal drifts, so this test pins the two together — the one place where both
 * modules may legitimately be imported at once.
 */
describe("the shared cache key", () => {
  it("matches Student Management's own key factory exactly", () => {
    const fingerprint = "organization-alsalam:all"
    const studentId = WITH_RECORDS as StudentId
    expect(studentFinancialSummaryKey(fingerprint, studentId)).toEqual([
      ...studentKeys.finance(fingerprint, studentId),
    ])
  })

  it("is invalidated by every balance-affecting command", () => {
    const fingerprint = "organization-alsalam:all"
    const expected = JSON.stringify([
      ...studentKeys.finance(fingerprint, WITH_RECORDS as StudentId),
    ])

    for (const kind of [
      "invoice",
      "payment",
      "installments",
      "reduction",
      "refund",
    ] as const) {
      const targets = invalidationTargets({
        kind,
        fingerprint,
        studentId: WITH_RECORDS,
      }).map((key) => JSON.stringify(key))
      // Both surfaces read the same records; neither may show a stale figure.
      expect(targets, kind).toContain(expected)
    }
  })
})
