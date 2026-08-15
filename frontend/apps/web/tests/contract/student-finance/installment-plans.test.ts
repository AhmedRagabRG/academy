import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { sum } from "@/shared/utils/money"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

const query = { page: 1, pageSize: 200 }
const basePlan = {
  scheduleBasis: "monthly" as const,
  firstDueDate: "2026-09-01T00:00:00.000Z",
}

async function invoiceByStatus(status: string): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices(query)
  return studentFinanceService.getInvoice(
    page.items.find((item) => item.status === status)!.id
  )
}

/** An invoice for a product type whose configuration permits installments. */
async function planEligibleInvoice(): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices(query)
  for (const row of page.items) {
    const invoice = await studentFinanceService.getInvoice(row.id)
    if (
      invoice.offeringKind !== "training-course" &&
      invoice.status !== "cancelled" &&
      invoice.payments.length === 0
    )
      return invoice
  }
  throw new Error("no plan-eligible invoice in fixtures")
}

beforeEach(() => resetFinanceStore())

describe("plan generation", () => {
  it("creates sequentially numbered installments with due dates and amounts", async () => {
    const invoice = await planEligibleInvoice()
    const updated = await studentFinanceService.generateInstallmentPlan({
      ...basePlan,
      invoiceId: invoice.id,
      count: 4,
      expectedVersion: invoice.version,
    })

    expect(updated.installments).toHaveLength(4)
    expect(updated.installments.map((item) => item.sequence)).toEqual([1, 2, 3, 4])
    for (const installment of updated.installments) {
      expect(installment.dueDate).toBeTruthy()
      expect(Number(installment.amount.amount)).toBeGreaterThan(0)
    }
  })

  it("sums installment amounts exactly to the invoice final amount", async () => {
    for (const count of [2, 3, 4, 6, 7, 12]) {
      resetFinanceStore()
      const invoice = await planEligibleInvoice()
      const updated = await studentFinanceService.generateInstallmentPlan({
        ...basePlan,
        invoiceId: invoice.id,
        count,
        expectedVersion: invoice.version,
      })

      const total = sum(
        updated.installments.map((item) => item.amount),
        "EGP",
        2
      )
      expect(total.amount).toBe(updated.derived.finalAmount.amount)
    }
  })

  it("spaces monthly due dates one month apart", async () => {
    const invoice = await planEligibleInvoice()
    const updated = await studentFinanceService.generateInstallmentPlan({
      ...basePlan,
      invoiceId: invoice.id,
      count: 3,
      expectedVersion: invoice.version,
    })

    expect(updated.installments[0]?.dueDate).toContain("2026-09")
    expect(updated.installments[1]?.dueDate).toContain("2026-10")
    expect(updated.installments[2]?.dueDate).toContain("2026-11")
  })

  it("records the plan with its count and basis", async () => {
    const invoice = await planEligibleInvoice()
    const updated = await studentFinanceService.generateInstallmentPlan({
      ...basePlan,
      invoiceId: invoice.id,
      count: 5,
      expectedVersion: invoice.version,
    })

    expect(updated.plan?.count).toBe(5)
    expect(updated.plan?.scheduleBasis).toBe("monthly")
    expect(updated.plan?.generatedBy.name).toBeTruthy()
  })

  it("adds exactly one timeline event per generated plan", async () => {
    const invoice = await planEligibleInvoice()
    const before = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })

    await studentFinanceService.generateInstallmentPlan({
      ...basePlan,
      invoiceId: invoice.id,
      count: 3,
      expectedVersion: invoice.version,
    })

    const after = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    expect(after.items.length).toBe(before.items.length + 1)
    expect(after.items[0]?.category).toBe("installment-plan-generated")
  })
})

describe("regeneration guards", () => {
  it("replaces unpaid installments when regenerated", async () => {
    const invoice = await planEligibleInvoice()
    const first = await studentFinanceService.generateInstallmentPlan({
      ...basePlan,
      invoiceId: invoice.id,
      count: 3,
      expectedVersion: invoice.version,
    })

    const second = await studentFinanceService.generateInstallmentPlan({
      ...basePlan,
      invoiceId: invoice.id,
      count: 6,
      expectedVersion: first.version,
    })

    expect(second.installments).toHaveLength(6)
    expect(second.plan?.id).not.toBe(first.plan?.id)
    expect(
      sum(second.installments.map((item) => item.amount), "EGP", 2).amount
    ).toBe(second.derived.finalAmount.amount)
  })

  it("refuses regeneration once an installment carries a payment", async () => {
    const invoice = await planEligibleInvoice()
    const planned = await studentFinanceService.generateInstallmentPlan({
      ...basePlan,
      invoiceId: invoice.id,
      count: 3,
      expectedVersion: invoice.version,
    })

    // Only an issued invoice accepts payment, so issue first when still draft.
    let current = planned
    if (current.status === "draft")
      current = await studentFinanceService.issueInvoice({
        invoiceId: current.id,
        expectedVersion: current.version,
      })

    const target = current.installments[0]!
    await studentFinanceService.recordPayment({
      invoiceId: current.id,
      installmentId: target.id,
      methodId: "cash",
      paymentDate: "2026-06-01T00:00:00.000Z",
      amount: "10.00",
      expectedVersion: current.version,
    })
    current = await studentFinanceService.getInvoice(current.id)

    await expect(
      studentFinanceService.generateInstallmentPlan({
        ...basePlan,
        invoiceId: current.id,
        count: 6,
        expectedVersion: current.version,
      })
    ).rejects.toMatchObject({ code: "plan-has-payments" })
  })

  it("leaves the existing plan intact when regeneration is refused", async () => {
    const invoice = await planEligibleInvoice()
    const planned = await studentFinanceService.generateInstallmentPlan({
      ...basePlan,
      invoiceId: invoice.id,
      count: 3,
      expectedVersion: invoice.version,
    })

    let current = planned
    if (current.status === "draft")
      current = await studentFinanceService.issueInvoice({
        invoiceId: current.id,
        expectedVersion: current.version,
      })
    await studentFinanceService.recordPayment({
      invoiceId: current.id,
      installmentId: current.installments[0]!.id,
      methodId: "cash",
      paymentDate: "2026-06-01T00:00:00.000Z",
      amount: "10.00",
      expectedVersion: current.version,
    })
    current = await studentFinanceService.getInvoice(current.id)

    await studentFinanceService
      .generateInstallmentPlan({
        ...basePlan,
        invoiceId: current.id,
        count: 6,
        expectedVersion: current.version,
      })
      .catch(() => undefined)

    const after = await studentFinanceService.getInvoice(current.id)
    expect(after.installments).toHaveLength(3)
  })

  it("refuses a stale version", async () => {
    const invoice = await planEligibleInvoice()
    await expect(
      studentFinanceService.generateInstallmentPlan({
        ...basePlan,
        invoiceId: invoice.id,
        count: 3,
        expectedVersion: invoice.version + 4,
      })
    ).rejects.toMatchObject({ code: "version-conflict" })
  })
})

describe("eligibility comes from configuration, not hardcoded product rules", () => {
  it("refuses a plan for a product type configured to disallow instalments", async () => {
    const page = await studentFinanceService.listInvoices(query)
    let courseInvoice: InvoiceDetail | undefined
    for (const row of page.items) {
      const invoice = await studentFinanceService.getInvoice(row.id)
      if (invoice.offeringKind === "training-course" && invoice.status !== "cancelled") {
        courseInvoice = invoice
        break
      }
    }
    expect(courseInvoice).toBeDefined()

    await expect(
      studentFinanceService.generateInstallmentPlan({
        ...basePlan,
        invoiceId: courseInvoice!.id,
        count: 3,
        expectedVersion: courseInvoice!.version,
      })
    ).rejects.toMatchObject({ code: "installments-not-permitted" })
  })

  it("refuses a count above the configured maximum", async () => {
    const invoice = await planEligibleInvoice()
    await expect(
      studentFinanceService.generateInstallmentPlan({
        ...basePlan,
        invoiceId: invoice.id,
        count: 99,
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "validation-failed" })
  })

  it("refuses a zero or negative count", async () => {
    const invoice = await planEligibleInvoice()
    for (const count of [0, -3])
      await expect(
        studentFinanceService.generateInstallmentPlan({
          ...basePlan,
          invoiceId: invoice.id,
          count,
          expectedVersion: invoice.version,
        })
      ).rejects.toMatchObject({ code: "validation-failed" })
  })

  it("exposes the eligibility policy through lookups", async () => {
    const lookups = await studentFinanceService.lookups()
    const course = lookups.installmentEligibility.find(
      (entry) => entry.offeringKind === "training-course"
    )
    const program = lookups.installmentEligibility.find(
      (entry) => entry.offeringKind === "professional-program"
    )
    // Courses default to paid-in-full, but it is configuration, not a rule.
    expect(course?.allowsPlan).toBe(false)
    expect(program?.allowsPlan).toBe(true)
    expect(program?.maxCount).toBeGreaterThan(0)
  })
})

describe("installment status and the queue", () => {
  it("derives overdue at the boundary against the injected clock", async () => {
    const invoice = await planEligibleInvoice()
    await studentFinanceService.generateInstallmentPlan({
      ...basePlan,
      invoiceId: invoice.id,
      count: 3,
      expectedVersion: invoice.version,
    })

    financeScenarios.setNow("2026-08-31T00:00:00.000Z")
    let detail = await studentFinanceService.getInvoice(invoice.id)
    expect(detail.installments[0]?.status).toBe("pending")

    financeScenarios.setNow("2026-09-02T00:00:00.000Z")
    detail = await studentFinanceService.getInvoice(invoice.id)
    expect(detail.installments[0]?.status).toBe("overdue")
  })

  it("lists installments across invoices with their derived status", async () => {
    const page = await studentFinanceService.listInstallments({
      page: 1,
      pageSize: 50,
    })
    expect(page.total).toBeGreaterThan(0)
    for (const item of page.items) {
      expect(item.invoiceNumber).toBeTruthy()
      expect(["pending", "partially-paid", "paid", "overdue"]).toContain(item.status)
      expect(Number(item.remaining.amount)).toBeGreaterThanOrEqual(0)
    }
  })

  it("filters the queue by status", async () => {
    financeScenarios.setNow("2027-01-01T00:00:00.000Z")
    const overdue = await studentFinanceService.listInstallments({
      page: 1,
      pageSize: 50,
      statuses: ["overdue"],
    })
    for (const item of overdue.items) expect(item.status).toBe("overdue")
  })

  it("refuses an inverted date range on the queue", async () => {
    await expect(
      studentFinanceService.listInstallments({
        page: 1,
        pageSize: 50,
        dateRange: { field: "dueDate", from: "2026-12-01", to: "2026-01-01" },
      })
    ).rejects.toMatchObject({ code: "invalid-date-range" })
  })

  it("refuses plan generation without finance.installments.manage", async () => {
    const invoice = await planEligibleInvoice()
    financeScenarios.withoutPermissions(["finance.installments.manage"])
    await expect(
      studentFinanceService.generateInstallmentPlan({
        ...basePlan,
        invoiceId: invoice.id,
        count: 3,
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})
