import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import {
  allFinancePermissions,
  financePermissions,
} from "@/features/student-finance/config/finance-permissions"
import type { InvoiceId, PaymentId } from "@/features/student-finance/types/common"

/**
 * Every one of the sixteen permission keys is enforced at the service, not merely
 * declared. This suite removes one key at a time and asserts the matching
 * operation is refused — the same shape of coverage Student Management has.
 */

const query = { page: 1, pageSize: 50 }

async function anyInvoiceId(): Promise<InvoiceId> {
  const page = await studentFinanceService.listInvoices(query)
  return page.items[0]!.id
}

async function draftInvoiceId(): Promise<InvoiceId> {
  const page = await studentFinanceService.listInvoices(query)
  return page.items.find((item) => item.status === "draft")!.id
}

async function anyPaymentId(): Promise<PaymentId> {
  const page = await studentFinanceService.listPayments(query)
  return page.items[0]!.id
}

beforeEach(() => resetFinanceStore())

describe("permission keys are defined and seeded", () => {
  it("declares exactly sixteen keys", () => {
    expect(allFinancePermissions).toHaveLength(16)
    expect(new Set(allFinancePermissions).size).toBe(16)
  })

  it("namespaces every key under finance", () => {
    for (const key of allFinancePermissions) expect(key.startsWith("finance.")).toBe(true)
  })
})

describe("read permissions are enforced", () => {
  it("refuses the invoice list without finance.invoices.view", async () => {
    financeScenarios.withoutPermissions([financePermissions.invoicesView])
    await expect(studentFinanceService.listInvoices(query)).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("refuses invoice detail without finance.invoices.view", async () => {
    const invoiceId = await anyInvoiceId()
    financeScenarios.withoutPermissions([financePermissions.invoicesView])
    await expect(studentFinanceService.getInvoice(invoiceId)).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("refuses the payment list without finance.payments.view", async () => {
    financeScenarios.withoutPermissions([financePermissions.paymentsView])
    await expect(studentFinanceService.listPayments(query)).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("refuses the refund list without finance.refunds.view", async () => {
    financeScenarios.withoutPermissions([financePermissions.refundsView])
    await expect(studentFinanceService.listRefunds(query)).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("refuses the financial profile without finance.view", async () => {
    financeScenarios.withoutPermissions([financePermissions.view])
    await expect(
      studentFinanceService.getStudentFinancialProfile("student-STD-2026-00001")
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses the timeline without finance.timeline.view", async () => {
    financeScenarios.withoutPermissions([financePermissions.timelineView])
    await expect(
      studentFinanceService.listTimeline("student-STD-2026-00001", { limit: 10 })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses export without finance.export", async () => {
    financeScenarios.withoutPermissions([financePermissions.export])
    await expect(studentFinanceService.exportInvoices(query)).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("refuses the accounting context without finance.view", async () => {
    financeScenarios.withoutPermissions([financePermissions.view])
    await expect(
      studentFinanceService.getAccountingContext(query)
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("invoice command permissions are enforced", () => {
  it("refuses raising invoices without finance.invoices.create", async () => {
    financeScenarios.withoutPermissions([financePermissions.invoicesCreate])
    await expect(
      studentFinanceService.raiseInvoices({ enrollmentId: "enrollment-1" })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses editing a draft without finance.invoices.update", async () => {
    const invoiceId = await draftInvoiceId()
    const invoice = await studentFinanceService.getInvoice(invoiceId)
    financeScenarios.withoutPermissions([financePermissions.invoicesUpdate])
    await expect(
      studentFinanceService.updateDraftInvoice({
        invoiceId,
        input: { totalAmount: "1000.00", dueDate: "2026-10-01T00:00:00.000Z" },
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses issuing without finance.invoices.issue", async () => {
    const invoiceId = await draftInvoiceId()
    const invoice = await studentFinanceService.getInvoice(invoiceId)
    financeScenarios.withoutPermissions([financePermissions.invoicesIssue])
    await expect(
      studentFinanceService.issueInvoice({ invoiceId, expectedVersion: invoice.version })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses cancelling without finance.invoices.cancel", async () => {
    const invoiceId = await draftInvoiceId()
    const invoice = await studentFinanceService.getInvoice(invoiceId)
    financeScenarios.withoutPermissions([financePermissions.invoicesCancel])
    await expect(
      studentFinanceService.cancelInvoice({
        invoiceId,
        reason: "أُنشئت بالخطأ",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses generating a plan without finance.installments.manage", async () => {
    const invoiceId = await anyInvoiceId()
    const invoice = await studentFinanceService.getInvoice(invoiceId)
    financeScenarios.withoutPermissions([financePermissions.installmentsManage])
    await expect(
      studentFinanceService.generateInstallmentPlan({
        invoiceId,
        count: 3,
        scheduleBasis: "monthly",
        firstDueDate: "2026-10-01T00:00:00.000Z",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("segregation of duties", () => {
  it("refuses recording a payment without finance.payments.record", async () => {
    const invoiceId = await anyInvoiceId()
    const invoice = await studentFinanceService.getInvoice(invoiceId)
    financeScenarios.withoutPermissions([financePermissions.paymentsRecord])
    await expect(
      studentFinanceService.recordPayment({
        invoiceId,
        methodId: "cash",
        paymentDate: "2026-06-01T00:00:00.000Z",
        amount: "10.00",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses approving a discount without finance.discounts.approve", async () => {
    const invoiceId = await anyInvoiceId()
    const invoice = await studentFinanceService.getInvoice(invoiceId)
    financeScenarios.withoutPermissions([financePermissions.discountsApprove])
    await expect(
      studentFinanceService.applyDiscount({
        invoiceId,
        kind: "percentage",
        value: "5",
        reason: "خصم",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses awarding a scholarship without finance.scholarships.approve", async () => {
    financeScenarios.withoutPermissions([financePermissions.scholarshipsApprove])
    await expect(
      studentFinanceService.awardScholarship({
        studentId: "student-STD-2026-00001",
        name: "منحة",
        kind: "percentage",
        value: "10",
        coverage: "partial-tuition",
        reason: "تفوق",
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses requesting a refund without finance.refunds.record", async () => {
    const paymentId = await anyPaymentId()
    financeScenarios.withoutPermissions([financePermissions.refundsRecord])
    await expect(
      studentFinanceService.requestRefund({
        paymentId,
        amount: "10.00",
        reason: "انسحاب",
        refundDate: "2026-06-01T00:00:00.000Z",
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses approving a refund without finance.refunds.approve", async () => {
    // The refund must be in `requested`, otherwise the transition check fires
    // first and reports an invalid transition rather than a permission refusal.
    const paymentId = await anyPaymentId()
    const refund = await studentFinanceService.requestRefund({
      paymentId,
      amount: "10.00",
      reason: "انسحاب",
      refundDate: "2026-06-01T00:00:00.000Z",
    })

    financeScenarios.withoutPermissions([financePermissions.refundsApprove])
    await expect(
      studentFinanceService.decideRefund({
        refundId: refund.id,
        decision: "approved",
        expectedVersion: 1,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses completing a refund without finance.refunds.approve", async () => {
    const paymentId = await anyPaymentId()
    const refund = await studentFinanceService.requestRefund({
      paymentId,
      amount: "10.00",
      reason: "انسحاب",
      refundDate: "2026-06-01T00:00:00.000Z",
    })
    const invoice = await studentFinanceService.getInvoice(refund.invoiceId)
    await studentFinanceService.decideRefund({
      refundId: refund.id,
      decision: "approved",
      expectedVersion: invoice.version,
    })

    financeScenarios.withoutPermissions([financePermissions.refundsApprove])
    await expect(
      studentFinanceService.completeRefund({
        refundId: refund.id,
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("lets a user record a payment while being unable to approve a discount", async () => {
    // The core separation: collecting money is not authorizing a concession.
    financeScenarios.onlyPermissions([
      financePermissions.view,
      financePermissions.invoicesView,
      financePermissions.paymentsView,
      financePermissions.paymentsRecord,
    ])

    await expect(studentFinanceService.listInvoices(query)).resolves.toBeDefined()

    const page = await studentFinanceService.listInvoices(query)
    const payable = page.items.find(
      (item) => item.status === "issued" || item.status === "partially-paid"
    )!
    const invoice = await studentFinanceService.getInvoice(payable.id)

    await expect(
      studentFinanceService.applyDiscount({
        invoiceId: payable.id,
        kind: "percentage",
        value: "5",
        reason: "خصم",
        expectedVersion: invoice.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })

    await expect(
      studentFinanceService.recordPayment({
        invoiceId: payable.id,
        methodId: "cash",
        paymentDate: "2026-06-01T00:00:00.000Z",
        amount: "10.00",
        expectedVersion: invoice.version,
      })
    ).resolves.toBeDefined()
  })

  it("lets a user request a refund while being unable to approve one", async () => {
    financeScenarios.onlyPermissions([
      financePermissions.view,
      financePermissions.invoicesView,
      financePermissions.paymentsView,
      financePermissions.refundsView,
      financePermissions.refundsRecord,
    ])

    const paymentId = await anyPaymentId()
    const refund = await studentFinanceService.requestRefund({
      paymentId,
      amount: "10.00",
      reason: "انسحاب",
      refundDate: "2026-06-01T00:00:00.000Z",
    })

    await expect(
      studentFinanceService.decideRefund({
        refundId: refund.id,
        decision: "approved",
        expectedVersion: 1,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("branch scope is enforced alongside permissions", () => {
  it("hides out-of-scope invoices from the list", async () => {
    const all = await studentFinanceService.listInvoices(query)
    financeScenarios.scopeToBranches(["branch-cairo"])
    const scoped = await studentFinanceService.listInvoices(query)

    expect(scoped.total).toBeGreaterThan(0)
    expect(scoped.total).toBeLessThan(all.total)
  })

  it("refuses direct access to an out-of-scope invoice", async () => {
    const all = await studentFinanceService.listInvoices(query)
    const alexInvoice = all.items.find((item) =>
      item.branchLabel.includes("الإسكندرية")
    )!
    financeScenarios.scopeToBranches(["branch-cairo"])

    await expect(
      studentFinanceService.getInvoice(alexInvoice.id)
    ).rejects.toMatchObject({ code: "out-of-scope" })
  })

  it("exports only rows within scope", async () => {
    financeScenarios.scopeToBranches(["branch-cairo"])
    const csv = await studentFinanceService.exportInvoices(query)
    const scoped = await studentFinanceService.listInvoices(query)
    expect(csv.trim().split("\n")).toHaveLength(scoped.total + 1)
  })
})
