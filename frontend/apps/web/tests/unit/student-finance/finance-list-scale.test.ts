import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import {
  defaultInstallmentListQuery,
  defaultInvoiceListQuery,
  defaultPaymentListQuery,
} from "@/features/student-finance/utils/finance-list-query"

/**
 * SC-010: search, filter, sort, and paging stay under 2 seconds at the 95th
 * percentile across 50,000 invoices, measured through the same service path the
 * UI uses — not against an internal shortcut.
 */

const SIZE = 50_000
const BUDGET_MS = 2000

/** Printed so a run produces the evidence, not just a pass. */
function report(label: string, p95: number) {
  console.log(`[scale] ${label}: p95 ${p95.toFixed(1)}ms`)
}

async function percentile95(run: () => Promise<unknown>, samples = 20) {
  const timings: number[] = []
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now()
    await run()
    timings.push(performance.now() - started)
  }
  timings.sort((left, right) => left - right)
  return timings[Math.min(timings.length - 1, Math.ceil(samples * 0.95) - 1)] ?? 0
}

// Vitest's 5s default would otherwise act as a second, load-dependent budget on
// top of the p95 assertion that is the real guard here.
const CASE_TIMEOUT_MS = 60_000

describe.sequential("finance queues at scale", () => {
  beforeEach(() => {
    resetFinanceStore()
    financeScenarios.useScale(true, SIZE)
  })
  afterEach(() => financeScenarios.reset())

  it("loads the generated set", async () => {
    const page = await studentFinanceService.listInvoices(defaultInvoiceListQuery)
    expect(page.total).toBeGreaterThanOrEqual(SIZE)
  }, CASE_TIMEOUT_MS)

  it("keeps a plain invoice page load within budget", async () => {
    const p95 = await percentile95(() =>
      studentFinanceService.listInvoices(defaultInvoiceListQuery)
    )
    report("invoices — plain page", p95)
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps invoice search within budget", async () => {
    const p95 = await percentile95(() =>
      studentFinanceService.listInvoices({
        ...defaultInvoiceListQuery,
        search: "STD-2026",
      })
    )
    report("invoices — search", p95)
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps combined filtering within budget", async () => {
    const p95 = await percentile95(() =>
      studentFinanceService.listInvoices({
        ...defaultInvoiceListQuery,
        statuses: ["issued", "partially-paid"],
        dateRange: { from: "2026-01-01", to: "2026-12-31", field: "issueDate" },
      })
    )
    report("invoices — status + date filter", p95)
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps sorting by amount within budget", async () => {
    const p95 = await percentile95(() =>
      studentFinanceService.listInvoices({
        ...defaultInvoiceListQuery,
        sort: { field: "finalAmount", direction: "desc" },
      })
    )
    report("invoices — sort by amount", p95)
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps deep paging within budget", async () => {
    const p95 = await percentile95(() =>
      studentFinanceService.listInvoices({
        ...defaultInvoiceListQuery,
        page: 500,
      })
    )
    report("invoices — deep paging", p95)
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps the payments queue within budget", async () => {
    const p95 = await percentile95(() =>
      studentFinanceService.listPayments(defaultPaymentListQuery)
    )
    report("payments queue", p95)
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps the installments queue within budget", async () => {
    const p95 = await percentile95(() =>
      studentFinanceService.listInstallments(defaultInstallmentListQuery)
    )
    report("installments queue", p95)
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps a single student's profile within budget at this volume", async () => {
    const page = await studentFinanceService.listInvoices(defaultInvoiceListQuery)
    const studentId = page.items[0]!.studentId
    const p95 = await percentile95(
      () => studentFinanceService.getStudentFinancialProfile(studentId),
      10
    )
    report("student financial profile", p95)
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps export within budget", async () => {
    const p95 = await percentile95(
      () =>
        studentFinanceService.exportInvoices({
          ...defaultInvoiceListQuery,
          pageSize: 200,
        }),
      10
    )
    report("export", p95)
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)
})
