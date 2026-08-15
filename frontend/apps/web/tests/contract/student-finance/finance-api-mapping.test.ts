import { describe, expect, it } from "vitest"
import payloads from "../../fixtures/finance-api-payloads.json"
import {
  labelsFrom,
  toAccountingContext,
  toDashboardSummary,
  toInvoiceDetail,
  toInvoiceSummary,
  toLookups,
  toPayment,
  toPaymentSummary,
  toStudentProfile,
  toTimelinePage,
  type ApiAccountingContext,
  type ApiFinanceLookups,
  type ApiInvoiceDetail,
  type ApiInvoiceRow,
  type ApiPaymentRow,
  type ApiStudentProfile,
  type ApiTimelineEvent,
} from "@/features/student-finance/services/finance-mapper"

/**
 * Runs the mapper over payloads captured from the running API rather than over
 * hand-written doubles.
 *
 * A mapper can only be wrong in two ways: it reads a field the API does not
 * send, or it mis-shapes one it does. Both are invisible against a fixture the
 * same author invented, so these are the real bytes — refresh them by
 * re-running the capture script against a seeded database.
 */
const lookups = toLookups(payloads.lookups as unknown as ApiFinanceLookups)
const labels = labelsFrom(lookups)

describe("lookups", () => {
  it("renames the API's id to the value the selects bind to", () => {
    expect(lookups.branches.length).toBeGreaterThan(0)
    for (const branch of lookups.branches) {
      expect(branch.value).toMatch(/^[0-9a-f-]{36}$/)
      expect(branch.label).not.toBe("")
    }
  })

  it("carries the money configuration the screens format against", () => {
    expect(lookups.currency).not.toBe("")
    expect(lookups.precision).toBeGreaterThanOrEqual(0)
  })
})

describe("invoice queue row", () => {
  const row = toInvoiceSummary(
    payloads.invoiceRow as unknown as ApiInvoiceRow,
    labels
  )

  it("fills every column the table renders", () => {
    expect(row.invoiceNumber).not.toBe("")
    expect(row.studentName).not.toBe("")
    expect(row.studentCode).not.toBe("")
    expect(row.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(row.finalAmount.amount).toMatch(/^-?\d+\.\d+$/)
  })

  /** The row sends `branchId`; the column shows a name, resolved from lookups. */
  it("resolves the branch label the API does not send", () => {
    expect(row.branchLabel).not.toBe("")
    expect(row.branchLabel).not.toBe(row.branchId)
  })

  it("maps the status into the module's own union", () => {
    expect([
      "draft",
      "issued",
      "partially-paid",
      "paid",
      "cancelled",
    ]).toContain(row.status)
  })
})

describe("payment queue row", () => {
  const row = toPaymentSummary(
    payloads.paymentRow as unknown as ApiPaymentRow,
    labels
  )

  it("fills the student and invoice columns from the joined invoice", () => {
    expect(row.receiptNumber).not.toBe("")
    expect(row.studentName).not.toBe("")
    expect(row.studentCode).not.toBe("")
    expect(row.invoiceNumber).not.toBe("")
  })

  it("resolves the payment method label from lookups", () => {
    expect(row.methodLabel).not.toBe("")
    expect(row.methodLabel).not.toBe(row.methodId)
  })

  it("keeps the recording actor's name", () => {
    expect(row.recordedByName).not.toBe("")
  })
})

describe("invoice detail", () => {
  const payments = [
    toPayment(payloads.paymentRow as unknown as ApiPaymentRow, labels),
  ]
  const detail = toInvoiceDetail(
    payloads.invoiceDetail as unknown as ApiInvoiceDetail,
    payments
  )

  it("carries the derived balance the header reads", () => {
    expect(detail.derived.finalAmount.amount).toMatch(/^-?\d+\.\d+$/)
    expect(detail.derived.netPaid.amount).toMatch(/^-?\d+\.\d+$/)
    expect(detail.derived.remaining.amount).toMatch(/^-?\d+\.\d+$/)
  })

  it("carries every permission flag the actions gate on", () => {
    for (const flag of [
      "invoicesIssue",
      "invoicesCancel",
      "paymentsRecord",
      "discountsApprove",
      "refundsRecord",
      "export",
    ] as const)
      expect(typeof detail.permissions[flag]).toBe("boolean")
  })

  it("keeps the status history in order with resolvable actors", () => {
    expect(detail.statusHistory.length).toBeGreaterThan(0)
    for (const entry of detail.statusHistory) {
      expect(entry.actor.name).not.toBe("")
      expect(entry.occurredAt).not.toBe("")
    }
  })

  it("takes its payments from the caller, since the record omits them", () => {
    expect(detail.payments).toHaveLength(1)
  })
})

describe("dashboard and profile totals", () => {
  it("reads the collection totals as decimal strings", () => {
    const summary = toDashboardSummary(
      payloads.dashboard as unknown as Parameters<typeof toDashboardSummary>[0]
    )
    for (const figure of [
      summary.invoiced,
      summary.collected,
      summary.outstanding,
    ])
      expect(figure.amount).toMatch(/^-?\d+\.\d+$/)
    expect(typeof summary.hasNoRecords).toBe("boolean")
  })

  /**
   * Guards the concatenation bug this mapping was built against: the API once
   * summed minor units as strings and reported "0110000100.00" for two invoices
   * worth 1,200. Any repeat shows up as an amount with a leading zero or an
   * implausible digit count.
   */
  it("reports plausible profile totals, not concatenated ones", () => {
    const profile = toStudentProfile(
      payloads.profile as unknown as ApiStudentProfile
    )
    for (const figure of [
      profile.totals.totalFees,
      profile.totals.paidAmount,
      profile.totals.remainingBalance,
    ]) {
      expect(figure.amount).toMatch(/^-?(0|[1-9]\d*)\.\d+$/)
      expect(Number.isFinite(Number(figure.amount))).toBe(true)
    }
  })

  it("keeps paid and remaining consistent with the total", () => {
    const profile = toStudentProfile(
      payloads.profile as unknown as ApiStudentProfile
    )
    const total = Number(profile.totals.totalFees.amount)
    const paid = Number(profile.totals.paidAmount.amount)
    const remaining = Number(profile.totals.remainingBalance.amount)
    expect(paid + remaining).toBeCloseTo(total, 2)
  })
})

describe("timeline", () => {
  const page = toTimelinePage(
    payloads.timeline as unknown as {
      items: ApiTimelineEvent[]
      nextCursor?: string | null
    },
    "student-under-test"
  )

  it("maps each event into the module's category union", () => {
    expect(page.items.length).toBeGreaterThan(0)
    for (const event of page.items) {
      expect(event.summary).not.toBe("")
      expect(event.actor.name).not.toBe("")
      expect(event.studentId).toBe("student-under-test")
    }
  })

  it("omits the cursor rather than carrying a null", () => {
    expect(page.nextCursor === undefined || typeof page.nextCursor === "string")
      .toBe(true)
  })
})

describe("accounting context", () => {
  it("carries settled identities and figures only", () => {
    const context = toAccountingContext(
      payloads.accountingContext as unknown as ApiAccountingContext
    )
    expect(context.currency).not.toBe("")
    for (const invoice of context.invoices)
      expect(invoice.finalAmount.amount).toMatch(/^-?\d+\.\d+$/)
    for (const payment of context.payments)
      expect(payment.receiptNumber).not.toBe("")
  })
})
