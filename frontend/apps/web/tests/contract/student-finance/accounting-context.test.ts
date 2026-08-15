import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { financePermissions } from "@/features/student-finance/config/finance-permissions"

beforeEach(() => resetFinanceStore())
afterEach(() => financeScenarios.reset())

const paging = { page: 1, pageSize: 200 }
const context = () => studentFinanceService.getAccountingContext(paging)

/** Names and identifiers that must never cross into an accounting hand-off. */
const PERSONAL_FIELDS = [
  "studentName",
  "studentCode",
  "nationalId",
  "phone",
  "email",
  "address",
  "guardianName",
  "notes",
  "birthDate",
  "photoUrl",
]

/**
 * Spec FR-048: the accounting hand-off carries settled facts and identities only.
 * A downstream ledger needs to know which invoice and which student, not who the
 * student is — sending more is a privacy leak that is invisible until it isn't.
 */
describe("the accounting context is minimal", () => {
  it("carries no student personal data on any invoice", async () => {
    const result = await context()
    for (const invoice of result.invoices)
      for (const field of PERSONAL_FIELDS)
        expect(Object.keys(invoice), field).not.toContain(field)
  })

  it("carries no personal data on any payment or refund", async () => {
    const result = await context()
    for (const row of [...result.payments, ...result.refunds])
      for (const field of PERSONAL_FIELDS)
        expect(Object.keys(row), field).not.toContain(field)
  })

  it("does not leak a student name anywhere in the serialized payload", async () => {
    const result = await context()
    const serialized = JSON.stringify(result)
    // A name from the fixtures; its presence anywhere would mean a leak.
    expect(serialized).not.toContain("يوسف عبد الرحمن")
    expect(serialized).not.toContain("منة الله شريف")
  })

  it("carries the student identity as an opaque id, not a profile", async () => {
    const result = await context()
    for (const invoice of result.invoices) {
      expect(invoice.studentId).toBeTruthy()
      expect(invoice.enrollmentId).toBeTruthy()
    }
  })

  it("exposes exactly the documented invoice fields and no more", async () => {
    const result = await context()
    for (const invoice of result.invoices)
      expect(Object.keys(invoice).sort()).toEqual(
        [
          "enrollmentId",
          "finalAmount",
          "id",
          "invoiceNumber",
          "issueDate",
          "status",
          "studentId",
        ].sort()
      )
  })

  it("exposes exactly the documented payment fields", async () => {
    const result = await context()
    for (const payment of result.payments)
      expect(Object.keys(payment).sort()).toEqual(
        [
          "amount",
          "id",
          "invoiceId",
          "methodId",
          "paymentDate",
          "receiptNumber",
        ].sort()
      )
  })

  it("exposes exactly the documented refund fields", async () => {
    const result = await context()
    for (const refund of result.refunds)
      expect(Object.keys(refund).sort()).toEqual(
        ["amount", "id", "paymentId", "refundDate", "status"].sort()
      )
  })
})

describe("it carries settled facts", () => {
  it("states its currency, precision, and as-of time", async () => {
    const result = await context()
    expect(result.currency).toBe("EGP")
    expect(result.precision).toBe(2)
    expect(Number.isNaN(new Date(result.asOf).getTime())).toBe(false)
  })

  it("carries money as decimal strings, never as numbers", async () => {
    const result = await context()
    for (const invoice of result.invoices)
      expect(typeof invoice.finalAmount.amount).toBe("string")
    for (const payment of result.payments)
      expect(typeof payment.amount.amount).toBe("string")
  })

  it("includes payments and refunds only for the invoices it returns", async () => {
    const result = await context()
    const ids = new Set(result.invoices.map((invoice) => invoice.id))
    for (const payment of result.payments) expect(ids.has(payment.invoiceId)).toBe(true)
  })

  it("carries refund status, so a downstream ledger can tell intent from money", async () => {
    const result = await context()
    for (const refund of result.refunds) expect(refund.status).toBeTruthy()
  })
})

describe("it obeys the same access rules as everything else", () => {
  it("requires the finance view permission", async () => {
    financeScenarios.withoutPermissions([financePermissions.view])
    await expect(context()).rejects.toMatchObject({ code: "forbidden" })
  })

  it("respects branch scope", async () => {
    const wide = await context()
    financeScenarios.scopeToBranches(["branch-cairo"])
    const scoped = await context()
    expect(scoped.invoices.length).toBeLessThan(wide.invoices.length)
  })

  it("returns nothing for a user with no branches", async () => {
    financeScenarios.scopeToBranches([])
    const result = await context()
    expect(result.invoices).toHaveLength(0)
    expect(result.payments).toHaveLength(0)
  })
})
