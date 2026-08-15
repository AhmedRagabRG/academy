import { describe, expect, it } from "vitest"
import {
  cancelInvoiceSchema,
  createDraftInvoiceSchema,
  createInstallmentPlanSchema,
  createPaymentSchema,
  createReductionSchema,
  createRefundSchema,
} from "@/features/student-finance/schemas/finance-schemas"
import { makeMoney } from "@/shared/utils/money"
import type {
  InstallmentEligibility,
  PaymentMethod,
} from "@/features/student-finance/types/domain"

const egp = (amount: string) => makeMoney(amount, "EGP", 2)
const TODAY = "2026-06-15T12:00:00.000Z"

const errorPaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.path.join("."))

describe("draft invoice schema", () => {
  const schema = createDraftInvoiceSchema("EGP", 2)

  it("accepts a valid draft", () => {
    expect(
      schema.safeParse({ totalAmount: "1000.00", dueDate: "2026-07-01" }).success
    ).toBe(true)
  })

  it("refuses a zero or non-numeric total", () => {
    expect(errorPaths(schema.safeParse({ totalAmount: "0", dueDate: "2026-07-01" }))).toContain("totalAmount")
    expect(errorPaths(schema.safeParse({ totalAmount: "abc", dueDate: "2026-07-01" }))).toContain("totalAmount")
  })

  it("requires a due date", () => {
    expect(errorPaths(schema.safeParse({ totalAmount: "100.00", dueDate: "" }))).toContain("dueDate")
  })
})

describe("installment plan schema", () => {
  const policy: InstallmentEligibility[] = [
    { offeringKind: "professional-program", allowsPlan: true, maxCount: 12 },
    { offeringKind: "training-course", allowsPlan: false, maxCount: 0 },
  ]
  const valid = { count: 6, scheduleBasis: "monthly" as const, firstDueDate: "2026-07-01" }

  it("accepts a permitted count", () => {
    expect(
      createInstallmentPlanSchema("professional-program", policy, false).safeParse(valid).success
    ).toBe(true)
  })

  it("refuses a count above the configured maximum", () => {
    const result = createInstallmentPlanSchema("professional-program", policy, false).safeParse({
      ...valid,
      count: 24,
    })
    expect(errorPaths(result)).toContain("count")
  })

  it("refuses a product type that disallows plans", () => {
    expect(
      createInstallmentPlanSchema("training-course", policy, false).safeParse(valid).success
    ).toBe(false)
  })

  it("refuses regeneration once an installment is paid", () => {
    expect(
      createInstallmentPlanSchema("professional-program", policy, true).safeParse(valid).success
    ).toBe(false)
  })
})

describe("payment schema", () => {
  const methods: PaymentMethod[] = [
    { id: "cash", label: "نقدي", active: true },
    { id: "legacy", label: "قديم", active: false },
  ]
  const base = {
    currency: "EGP",
    precision: 2,
    invoiceRemaining: egp("600.00"),
    methods,
    issueDate: "2026-01-01T00:00:00.000Z",
    today: TODAY,
  }
  const valid = { methodId: "cash", paymentDate: "2026-06-01", amount: "100.00" }

  it("accepts a payment within the remaining balance", () => {
    expect(createPaymentSchema(base).safeParse(valid).success).toBe(true)
  })

  it("accepts a payment settling exactly the remaining balance", () => {
    expect(
      createPaymentSchema(base).safeParse({ ...valid, amount: "600.00" }).success
    ).toBe(true)
  })

  it("refuses a payment exceeding the remaining balance", () => {
    const result = createPaymentSchema(base).safeParse({ ...valid, amount: "600.01" })
    expect(errorPaths(result)).toContain("amount")
  })

  it("refuses zero, negative, and non-numeric amounts", () => {
    for (const amount of ["0", "0.00", "-5.00", "abc"])
      expect(createPaymentSchema(base).safeParse({ ...valid, amount }).success).toBe(false)
  })

  it("refuses an amount exceeding the targeted installment", () => {
    const result = createPaymentSchema({
      ...base,
      installmentRemaining: egp("250.00"),
    }).safeParse({ ...valid, amount: "300.00" })
    expect(errorPaths(result)).toContain("amount")
  })

  it("refuses an inactive payment method", () => {
    const result = createPaymentSchema(base).safeParse({ ...valid, methodId: "legacy" })
    expect(errorPaths(result)).toContain("methodId")
  })

  it("refuses an unknown payment method", () => {
    expect(
      createPaymentSchema(base).safeParse({ ...valid, methodId: "nope" }).success
    ).toBe(false)
  })

  it("refuses a future payment date", () => {
    const result = createPaymentSchema(base).safeParse({ ...valid, paymentDate: "2026-12-01" })
    expect(errorPaths(result)).toContain("paymentDate")
  })

  it("refuses a payment dated before the invoice was issued", () => {
    const result = createPaymentSchema(base).safeParse({ ...valid, paymentDate: "2025-06-01" })
    expect(errorPaths(result)).toContain("paymentDate")
  })
})

describe("reduction schema", () => {
  const base = {
    base: egp("1000.00"),
    currentFinal: egp("1000.00"),
    collected: egp("0.00"),
    policy: { maxPercentage: "50", maxAmount: egp("5000.00") },
  }
  const valid = { kind: "percentage" as const, value: "10", reason: "خصم متفوقين" }

  it("accepts a reduction within the limit", () => {
    expect(createReductionSchema(base).safeParse(valid).success).toBe(true)
  })

  it("refuses a percentage above the configured limit", () => {
    expect(errorPaths(createReductionSchema(base).safeParse({ ...valid, value: "80" }))).toContain("value")
  })

  it("refuses a reduction dropping the balance below what was collected", () => {
    const result = createReductionSchema({
      ...base,
      collected: egp("800.00"),
    }).safeParse({ kind: "amount", value: "500.00", reason: "تسوية" })
    expect(errorPaths(result)).toContain("value")
  })

  it("requires a reason", () => {
    expect(errorPaths(createReductionSchema(base).safeParse({ ...valid, reason: "" }))).toContain("reason")
  })

  it("requires a name when the caller asks for one, as scholarships do", () => {
    const schema = createReductionSchema({ ...base, requireName: true })
    expect(errorPaths(schema.safeParse(valid))).toContain("name")
    expect(schema.safeParse({ ...valid, name: "منحة التفوق" }).success).toBe(true)
  })
})

describe("refund schema", () => {
  const base = {
    currency: "EGP",
    precision: 2,
    refundable: egp("300.00"),
    today: TODAY,
  }
  const valid = { amount: "100.00", reason: "انسحاب الطالب", refundDate: "2026-06-01" }

  it("accepts a refund within the refundable amount", () => {
    expect(createRefundSchema(base).safeParse(valid).success).toBe(true)
  })

  it("accepts a refund of exactly the refundable amount", () => {
    expect(createRefundSchema(base).safeParse({ ...valid, amount: "300.00" }).success).toBe(true)
  })

  it("refuses a refund exceeding what remains refundable", () => {
    expect(errorPaths(createRefundSchema(base).safeParse({ ...valid, amount: "300.01" }))).toContain("amount")
  })

  it("refuses a zero or negative refund", () => {
    for (const amount of ["0", "-1.00"])
      expect(createRefundSchema(base).safeParse({ ...valid, amount }).success).toBe(false)
  })

  it("requires a reason", () => {
    expect(errorPaths(createRefundSchema(base).safeParse({ ...valid, reason: "" }))).toContain("reason")
  })

  it("refuses a future refund date", () => {
    expect(
      errorPaths(createRefundSchema(base).safeParse({ ...valid, refundDate: "2026-12-01" }))
    ).toContain("refundDate")
  })
})

describe("cancel invoice schema", () => {
  it("requires a reason", () => {
    expect(cancelInvoiceSchema.safeParse({ reason: "" }).success).toBe(false)
    expect(cancelInvoiceSchema.safeParse({ reason: "أُنشئت بالخطأ" }).success).toBe(true)
  })
})
