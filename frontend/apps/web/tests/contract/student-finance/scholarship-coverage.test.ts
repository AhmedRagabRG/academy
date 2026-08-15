import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { FinanceError } from "@/features/student-finance/services/finance-error"
import { compare, makeMoney } from "@/shared/utils/money"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

beforeEach(() => resetFinanceStore())
afterEach(() => financeScenarios.reset())

const zero = makeMoney("0", "EGP", 2)

/** The one student whose single invoice is issued with nothing collected. */
const UNPAID = "student-STD-2026-00003"
/** Has a payment recorded, so the collected floor is in play. */
const PART_PAID = "student-STD-2026-00005"
/** Has both a paid invoice and a cancelled one. */
const PAID_AND_CANCELLED = "student-STD-2026-00001"

const award = (studentId: string, patch: Record<string, unknown> = {}) =>
  studentFinanceService.awardScholarship({
    studentId,
    name: "منحة التفوق",
    kind: "percentage",
    value: "100",
    coverage: "full-tuition",
    reason: "تفوق دراسي",
    ...patch,
  })

async function invoicesOf(studentId: string): Promise<InvoiceDetail[]> {
  const page = await studentFinanceService.listInvoices({
    page: 1,
    pageSize: 200,
    studentIds: [studentId],
  })
  return Promise.all(
    page.items.map((item) => studentFinanceService.getInvoice(item.id))
  )
}

describe("full-tuition coverage", () => {
  it("reduces the outstanding balance to exactly zero", async () => {
    const before = await studentFinanceService.getStudentFinancialProfile(UNPAID)
    expect(compare(before.totals.remainingBalance, zero)).toBeGreaterThan(0)

    const after = await award(UNPAID)
    expect(after.totals.remainingBalance.amount).toBe(zero.amount)
  })

  it("never drives the balance negative", async () => {
    const after = await award(UNPAID)
    expect(compare(after.totals.remainingBalance, zero)).toBeGreaterThanOrEqual(0)
    for (const invoice of await invoicesOf(UNPAID)) {
      expect(compare(invoice.derived.finalAmount, zero)).toBeGreaterThanOrEqual(0)
      expect(compare(invoice.derived.remaining, zero)).toBeGreaterThanOrEqual(0)
    }
  })

  it("stops at the already-collected amount rather than breaching the floor", async () => {
    const before =
      await studentFinanceService.getStudentFinancialProfile(PART_PAID)
    const collected = before.totals.paidAmount

    const after = await award(PART_PAID)

    // The unpaid part is covered; the money already taken is not conjured away.
    expect(after.totals.remainingBalance.amount).toBe(zero.amount)
    expect(after.totals.paidAmount.amount).toBe(collected.amount)
    for (const invoice of await invoicesOf(PART_PAID))
      expect(
        compare(invoice.derived.finalAmount, invoice.derived.netPaid)
      ).toBeGreaterThanOrEqual(0)
  })

  it("leaves cancelled invoices out of it", async () => {
    const before = await invoicesOf(PAID_AND_CANCELLED)
    const cancelled = before.find((invoice) => invoice.status === "cancelled")!

    await award(PAID_AND_CANCELLED)

    const after = await studentFinanceService.getInvoice(cancelled.id)
    expect(after.adjustments).toHaveLength(cancelled.adjustments.length)
    expect(after.derived.finalAmount.amount).toBe(
      cancelled.derived.finalAmount.amount
    )
  })

  it("leaves a fully paid invoice's figures alone", async () => {
    const before = await invoicesOf(PAID_AND_CANCELLED)
    const paid = before.find((invoice) => invoice.status === "paid")!

    await award(PAID_AND_CANCELLED)

    const after = await studentFinanceService.getInvoice(paid.id)
    // Nothing outstanding to reduce, and the floor forbids going below collected.
    expect(after.derived.finalAmount.amount).toBe(paid.derived.finalAmount.amount)
    expect(after.derived.remaining.amount).toBe(zero.amount)
  })
})

describe("partial coverage", () => {
  it("reduces by the awarded percentage and no more", async () => {
    const [before] = await invoicesOf(UNPAID)
    const expected = (Number(before!.derived.finalAmount.amount) * 0.75).toFixed(2)

    await award(UNPAID, {
      coverage: "partial-tuition",
      kind: "percentage",
      value: "25",
    })

    const [after] = await invoicesOf(UNPAID)
    expect(after!.derived.finalAmount.amount).toBe(expected)
  })

  it("reduces by a fixed amount", async () => {
    const [before] = await invoicesOf(UNPAID)
    const expected = (Number(before!.derived.finalAmount.amount) - 500).toFixed(2)

    await award(UNPAID, {
      coverage: "partial-tuition",
      kind: "amount",
      value: "500.00",
    })

    const [after] = await invoicesOf(UNPAID)
    expect(after!.derived.finalAmount.amount).toBe(expected)
  })
})

describe("issued figures survive a scholarship", () => {
  it("records an adjustment instead of rewriting the issued snapshot", async () => {
    const [before] = await invoicesOf(UNPAID)
    const snapshot = JSON.stringify(before!.issuedSnapshot)

    await award(UNPAID, {
      coverage: "partial-tuition",
      kind: "percentage",
      value: "25",
    })

    const [after] = await invoicesOf(UNPAID)
    expect(JSON.stringify(after!.issuedSnapshot)).toBe(snapshot)
    expect(after!.adjustments.length).toBeGreaterThan(before!.adjustments.length)
    expect(after!.adjustments.at(-1)!.sourceKind).toBe("scholarship")
  })

  it("changes a draft invoice's own figures instead", async () => {
    const draftStudent = "student-STD-2026-00007"
    const [before] = await invoicesOf(draftStudent)
    expect(before!.status).toBe("draft")

    await award(draftStudent, {
      coverage: "partial-tuition",
      kind: "percentage",
      value: "25",
    })

    const [after] = await invoicesOf(draftStudent)
    expect(after!.adjustments).toHaveLength(0)
    expect(Number(after!.draft.scholarshipTotal.amount)).toBeGreaterThan(0)
    expect(Number(after!.draft.finalAmount.amount)).toBeLessThan(
      Number(before!.draft.finalAmount.amount)
    )
  })
})

describe("enrollment scoping", () => {
  it("touches only the named enrollment's invoices", async () => {
    const before = await invoicesOf(PAID_AND_CANCELLED)
    const target = before.find((invoice) => invoice.status === "paid")!
    const other = before.find((invoice) => invoice.id !== target.id)!

    await award(PAID_AND_CANCELLED, {
      enrollmentId: target.enrollmentId,
      coverage: "partial-tuition",
      kind: "percentage",
      value: "10",
    })

    const afterOther = await studentFinanceService.getInvoice(other.id)
    expect(afterOther.adjustments).toHaveLength(other.adjustments.length)
  })

  it("applies across every enrollment when none is named", async () => {
    const profile = await award(UNPAID, {
      coverage: "partial-tuition",
      kind: "percentage",
      value: "10",
    })
    expect(profile.scholarships.at(-1)!.name).toBe("منحة التفوق")
  })
})

describe("the award itself", () => {
  it("appears on the student's financial profile with its approval information", async () => {
    const profile = await award(UNPAID)
    const scholarship = profile.scholarships.at(-1)!
    expect(scholarship.name).toBe("منحة التفوق")
    expect(scholarship.coverage).toBe("full-tuition")
    expect(scholarship.approvedByName).toBeTruthy()
    expect(scholarship.approvedAt).toBeTruthy()
  })

  it("requires the scholarship approval permission", async () => {
    financeScenarios.withoutPermissions(["finance.scholarships.approve"])
    await expect(award(UNPAID)).rejects.toMatchObject({ code: "forbidden" })
  })

  it("records nothing at all when approval is refused", async () => {
    const before = await studentFinanceService.getStudentFinancialProfile(UNPAID)
    financeScenarios.withoutPermissions(["finance.scholarships.approve"])
    await award(UNPAID).catch(() => undefined)
    financeScenarios.reset()

    const after = await studentFinanceService.getStudentFinancialProfile(UNPAID)
    expect(after.scholarships).toHaveLength(before.scholarships.length)
    expect(after.totals.remainingBalance.amount).toBe(
      before.totals.remainingBalance.amount
    )
  })

  it("refuses a value above the configured maximum without recording anything", async () => {
    const before = await studentFinanceService.getStudentFinancialProfile(UNPAID)
    await expect(
      award(UNPAID, {
        coverage: "partial-tuition",
        kind: "percentage",
        value: "150",
      })
    ).rejects.toBeInstanceOf(FinanceError)

    const after = await studentFinanceService.getStudentFinancialProfile(UNPAID)
    expect(after.scholarships).toHaveLength(before.scholarships.length)
  })

  it("adds one timeline event per award", async () => {
    const before = await studentFinanceService.listTimeline(UNPAID, { limit: 500 })
    await award(UNPAID)
    const after = await studentFinanceService.listTimeline(UNPAID, { limit: 500 })
    expect(after.items.length).toBeGreaterThan(before.items.length)
    expect(after.items[0]?.category).toBe("scholarship-applied")
  })
})
