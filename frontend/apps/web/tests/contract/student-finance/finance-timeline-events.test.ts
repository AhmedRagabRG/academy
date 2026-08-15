import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import type { InvoiceId } from "@/features/student-finance/types/common"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

beforeEach(() => resetFinanceStore())
afterEach(() => financeScenarios.reset())

const paging = { page: 1, pageSize: 200 }

async function invoiceWith(status: string): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices(paging)
  return studentFinanceService.getInvoice(
    page.items.find((item) => item.status === status)!.id
  )
}

const reload = (id: InvoiceId) => studentFinanceService.getInvoice(id)

async function timelineLength(studentId: string) {
  const page = await studentFinanceService.listTimeline(studentId, { limit: 500 })
  return page.items.length
}

async function latest(studentId: string) {
  const page = await studentFinanceService.listTimeline(studentId, { limit: 500 })
  return page.items[0]
}

/**
 * FR-034: every financial event is recorded once, in the same operation that
 * caused it. Two guarantees matter equally — a success writes exactly one event,
 * and a refusal writes none. A refused command that still leaves a trace would
 * make the timeline a record of attempts rather than of what happened.
 */
describe("exactly one event per successful command", () => {
  it("issuing an invoice", async () => {
    const invoice = await invoiceWith("draft")
    const before = await timelineLength(invoice.studentId)

    await studentFinanceService.issueInvoice({
      invoiceId: invoice.id,
      expectedVersion: invoice.version,
    })

    expect(await timelineLength(invoice.studentId)).toBe(before + 1)
    expect((await latest(invoice.studentId))?.category).toBe("invoice-issued")
  })

  it("cancelling an invoice", async () => {
    const invoice = await invoiceWith("draft")
    const before = await timelineLength(invoice.studentId)

    await studentFinanceService.cancelInvoice({
      invoiceId: invoice.id,
      reason: "طلب الطالب",
      expectedVersion: invoice.version,
    })

    expect(await timelineLength(invoice.studentId)).toBe(before + 1)
    expect((await latest(invoice.studentId))?.category).toBe("invoice-cancelled")
  })

  it("generating an installment plan", async () => {
    // A product type that permits plans — eligibility is configuration, not a
    // property of every invoice.
    const page = await studentFinanceService.listInvoices(paging)
    const candidate = page.items.find(
      (item) => item.status === "issued" && item.offeringLabel.includes("بيانات")
    )!
    const invoice = await studentFinanceService.getInvoice(candidate.id)
    const before = await timelineLength(invoice.studentId)

    await studentFinanceService.generateInstallmentPlan({
      invoiceId: invoice.id,
      count: 3,
      scheduleBasis: "monthly",
      firstDueDate: "2026-09-01",
      expectedVersion: invoice.version,
    })

    expect(await timelineLength(invoice.studentId)).toBe(before + 1)
    expect((await latest(invoice.studentId))?.category).toBe(
      "installment-plan-generated"
    )
  })

  it("recording a payment", async () => {
    const invoice = await invoiceWith("issued")
    const before = await timelineLength(invoice.studentId)
    const lookups = await studentFinanceService.lookups()

    await studentFinanceService.recordPayment({
      invoiceId: invoice.id,
      methodId: lookups.paymentMethods.find((method) => method.active)!.id,
      amount: "100.00",
      paymentDate: "2026-08-01",
      expectedVersion: invoice.version,
    })

    expect(await timelineLength(invoice.studentId)).toBe(before + 1)
    expect((await latest(invoice.studentId))?.category).toBe("payment-received")
  })

  it("applying a discount before issuance", async () => {
    const invoice = await invoiceWith("draft")
    const before = await timelineLength(invoice.studentId)

    await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "10",
      reason: "خصم معتمد",
      expectedVersion: invoice.version,
    })

    expect(await timelineLength(invoice.studentId)).toBe(before + 1)
    expect((await latest(invoice.studentId))?.category).toBe("discount-applied")
  })

  it("applying a discount after issuance", async () => {
    const invoice = await invoiceWith("issued")
    const before = await timelineLength(invoice.studentId)

    await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "10",
      reason: "تسوية",
      expectedVersion: invoice.version,
    })

    expect(await timelineLength(invoice.studentId)).toBe(before + 1)
    expect((await latest(invoice.studentId))?.category).toBe("adjustment-recorded")
  })

  it("awarding a scholarship", async () => {
    const invoice = await invoiceWith("issued")
    const before = await timelineLength(invoice.studentId)

    await studentFinanceService.awardScholarship({
      studentId: invoice.studentId,
      name: "منحة التفوق",
      kind: "percentage",
      value: "10",
      coverage: "partial-tuition",
      reason: "تفوق",
    })

    // One event for the award, however many invoices it touches.
    expect(await timelineLength(invoice.studentId)).toBe(before + 1)
    expect((await latest(invoice.studentId))?.category).toBe("scholarship-applied")
  })

  it("requesting a refund", async () => {
    const invoice = await invoiceWith("paid")
    const before = await timelineLength(invoice.studentId)

    await studentFinanceService.requestRefund({
      paymentId: invoice.payments[0]!.id,
      amount: "100.00",
      reason: "انسحاب",
      refundDate: "2026-08-01",
    })

    expect(await timelineLength(invoice.studentId)).toBe(before + 1)
    expect((await latest(invoice.studentId))?.category).toBe("refund-requested")
  })

  it("completing a refund", async () => {
    const invoice = await invoiceWith("paid")
    const refund = await studentFinanceService.requestRefund({
      paymentId: invoice.payments[0]!.id,
      amount: "100.00",
      reason: "انسحاب",
      refundDate: "2026-08-01",
    })
    await studentFinanceService.decideRefund({
      refundId: refund.id,
      decision: "approved",
      expectedVersion: (await reload(invoice.id)).version,
    })

    const before = await timelineLength(invoice.studentId)
    await studentFinanceService.completeRefund({
      refundId: refund.id,
      expectedVersion: (await reload(invoice.id)).version,
    })

    expect(await timelineLength(invoice.studentId)).toBe(before + 1)
    expect((await latest(invoice.studentId))?.category).toBe("refund-completed")
  })
})

describe("no event at all per refused command", () => {
  const refusals: Array<{
    name: string
    run: (invoice: InvoiceDetail) => Promise<unknown>
    status: string
  }> = [
    {
      name: "issuing with a stale version",
      status: "draft",
      run: (invoice) =>
        studentFinanceService.issueInvoice({
          invoiceId: invoice.id,
          expectedVersion: invoice.version + 3,
        }),
    },
    {
      name: "cancelling without a reason",
      status: "draft",
      run: (invoice) =>
        studentFinanceService.cancelInvoice({
          invoiceId: invoice.id,
          reason: "   ",
          expectedVersion: invoice.version,
        }),
    },
    {
      name: "a payment above the remaining balance",
      status: "issued",
      run: (invoice) =>
        studentFinanceService.recordPayment({
          invoiceId: invoice.id,
          methodId: "cash",
          amount: "9999999.00",
          paymentDate: "2026-08-01",
          expectedVersion: invoice.version,
        }),
    },
    {
      name: "a discount above the configured limit",
      status: "issued",
      run: (invoice) =>
        studentFinanceService.applyDiscount({
          invoiceId: invoice.id,
          kind: "percentage",
          value: "90",
          reason: "خصم كبير",
          expectedVersion: invoice.version,
        }),
    },
    {
      name: "a plan for a product type that disallows one",
      status: "issued",
      run: (invoice) =>
        studentFinanceService.generateInstallmentPlan({
          invoiceId: invoice.id,
          count: 999,
          scheduleBasis: "monthly",
          firstDueDate: "2026-09-01",
          expectedVersion: invoice.version,
        }),
    },
    {
      name: "a refund above the payment amount",
      status: "paid",
      run: (invoice) =>
        studentFinanceService.requestRefund({
          paymentId: invoice.payments[0]!.id,
          amount: "9999999.00",
          reason: "استرداد",
          refundDate: "2026-08-01",
        }),
    },
  ]

  for (const { name, run, status } of refusals) {
    it(`writes nothing for ${name}`, async () => {
      const invoice = await invoiceWith(status)
      const before = await timelineLength(invoice.studentId)

      await run(invoice).catch(() => undefined)

      expect(await timelineLength(invoice.studentId)).toBe(before)
    })
  }

  it("writes nothing when a command is refused for lack of permission", async () => {
    const invoice = await invoiceWith("draft")
    const before = await timelineLength(invoice.studentId)

    financeScenarios.withoutPermissions(["finance.invoices.issue"])
    await studentFinanceService
      .issueInvoice({ invoiceId: invoice.id, expectedVersion: invoice.version })
      .catch(() => undefined)
    financeScenarios.reset()

    expect(await timelineLength(invoice.studentId)).toBe(before)
  })

  it("writes nothing when a command is refused for being out of scope", async () => {
    const invoice = await invoiceWith("draft")
    const before = await timelineLength(invoice.studentId)

    financeScenarios.scopeToBranches(["branch-does-not-exist"])
    await studentFinanceService
      .issueInvoice({ invoiceId: invoice.id, expectedVersion: invoice.version })
      .catch(() => undefined)
    financeScenarios.reset()

    expect(await timelineLength(invoice.studentId)).toBe(before)
  })
})

describe("every event is attributable and ordered", () => {
  it("carries an actor and a time", async () => {
    const invoice = await invoiceWith("draft")
    await studentFinanceService.issueInvoice({
      invoiceId: invoice.id,
      expectedVersion: invoice.version,
    })

    const event = await latest(invoice.studentId)
    expect(event?.actor.name).toBeTruthy()
    expect(event?.occurredAt).toBeTruthy()
    expect(Number.isNaN(new Date(event!.occurredAt).getTime())).toBe(false)
  })

  it("returns newest first", async () => {
    const invoice = await invoiceWith("draft")
    await studentFinanceService.issueInvoice({
      invoiceId: invoice.id,
      expectedVersion: invoice.version,
    })

    const page = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    const times = page.items.map((item) => new Date(item.occurredAt).getTime())
    for (let index = 1; index < times.length; index += 1)
      expect(times[index - 1]!).toBeGreaterThanOrEqual(times[index]!)
  })

  it("keeps two events written in the same instant in a stable order", async () => {
    // The injected clock makes every event in a test share a timestamp, so the
    // sequence tiebreak is what keeps paging from repeating or skipping rows.
    const invoice = await invoiceWith("issued")
    for (const value of ["5", "6"])
      await studentFinanceService.applyDiscount({
        invoiceId: (await reload(invoice.id)).id,
        kind: "percentage",
        value,
        reason: "تسوية",
        expectedVersion: (await reload(invoice.id)).version,
      })

    const first = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    const second = await studentFinanceService.listTimeline(invoice.studentId, {
      limit: 500,
    })
    expect(first.items.map((item) => item.id)).toEqual(
      second.items.map((item) => item.id)
    )
  })

  it("requires the timeline permission", async () => {
    const invoice = await invoiceWith("draft")
    financeScenarios.withoutPermissions(["finance.timeline.view"])
    await expect(
      studentFinanceService.listTimeline(invoice.studentId, { limit: 20 })
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})
