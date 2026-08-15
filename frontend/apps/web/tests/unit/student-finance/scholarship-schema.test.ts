import { describe, expect, it } from "vitest"
import { createReductionSchema } from "@/features/student-finance/schemas/finance-schemas"
import { makeMoney } from "@/shared/utils/money"

const egp = (amount: string) => makeMoney(amount, "EGP", 2)

const limits: Parameters<typeof createReductionSchema>[0] = {
  base: egp("10000.00"),
  currentFinal: egp("10000.00"),
  collected: egp("0.00"),
  policy: { maxPercentage: "100" },
  requireName: true,
}

type Award = {
  name: string
  kind: "percentage" | "amount"
  value: string
  coverage: "full-tuition" | "partial-tuition"
  reason: string
}

const valid: Award = {
  name: "منحة التفوق",
  kind: "percentage",
  value: "50",
  coverage: "partial-tuition",
  reason: "تفوق دراسي",
}

const parse = (
  patch: Partial<Award>,
  overrides: Partial<typeof limits> = {}
) => createReductionSchema({ ...limits, ...overrides }).safeParse({ ...valid, ...patch })

const firstMessage = (result: ReturnType<typeof parse>) =>
  result.success ? undefined : result.error.issues[0]?.message

describe("scholarship identity", () => {
  it("accepts a complete award", () => {
    expect(parse({}).success).toBe(true)
  })

  it("requires a name when the schema is built for a scholarship", () => {
    expect(parse({ name: "" }).success).toBe(false)
    expect(firstMessage(parse({ name: "" }))).toContain("اسم المنحة")
  })

  it("requires a reason", () => {
    expect(parse({ reason: "" }).success).toBe(false)
  })

  it("accepts both coverage values", () => {
    expect(parse({ coverage: "full-tuition" }).success).toBe(true)
    expect(parse({ coverage: "partial-tuition" }).success).toBe(true)
  })
})

describe("percentage range", () => {
  it("accepts the full range up to the configured maximum", () => {
    for (const value of ["0.5", "25", "99.99", "100"])
      expect(parse({ value }).success, value).toBe(true)
  })

  it("refuses zero, negative, and above one hundred", () => {
    for (const value of ["0", "-10", "100.01", "150"])
      expect(parse({ value }).success, value).toBe(false)
  })

  it("refuses a percentage above a lower configured maximum", () => {
    const result = parse({ value: "80" }, { policy: { maxPercentage: "50" } })
    expect(result.success).toBe(false)
    expect(firstMessage(result)).toContain("50")
  })

  it("refuses a malformed number without throwing", () => {
    for (const value of ["abc", "", "1.2.3", "١٠"])
      expect(() => parse({ value })).not.toThrow()
    expect(parse({ value: "abc" }).success).toBe(false)
  })
})

describe("fixed-amount ceiling", () => {
  const amountAward: Award = { ...valid, kind: "amount" }
  const parseAmount = (value: string, overrides: Partial<typeof limits> = {}) =>
    createReductionSchema({ ...limits, ...overrides }).safeParse({
      ...amountAward,
      value,
    })

  it("accepts an amount within the base", () => {
    expect(parseAmount("2500.00").success).toBe(true)
  })

  it("refuses an amount above the configured ceiling", () => {
    const result = parseAmount("9000.00", {
      policy: { maxPercentage: "100", maxAmount: egp("5000.00") },
    })
    expect(result.success).toBe(false)
    expect(firstMessage(result)).toContain("5000.00")
  })

  it("refuses a zero amount", () => {
    expect(parseAmount("0").success).toBe(false)
  })
})

describe("the already-collected floor", () => {
  it("refuses a reduction that would drop the balance below what was collected", () => {
    const result = parse(
      { value: "100" },
      { collected: egp("4000.00"), currentFinal: egp("10000.00") }
    )
    expect(result.success).toBe(false)
    // The refusal points at the refund flow rather than just saying "invalid".
    expect(firstMessage(result)).toContain("المحصّل")
  })

  it("accepts a reduction that stops exactly at the collected amount", () => {
    // 10,000 base, 6,000 collected — a 40% award lands exactly on the floor.
    const result = parse(
      { value: "40" },
      { collected: egp("6000.00"), currentFinal: egp("10000.00") }
    )
    expect(result.success).toBe(true)
  })
})
