import { describe, expect, it } from "vitest"
import {
  addMonths,
  allowsInstallments,
  buildSchedule,
  maxInstallmentCount,
  validatePlanRequest,
} from "@/features/student-finance/utils/finance-installments"
import { makeMoney, sum } from "@/shared/utils/money"
import type { InstallmentEligibility } from "@/features/student-finance/types/domain"

const egp = (amount: string) => makeMoney(amount, "EGP", 2)

const policy: InstallmentEligibility[] = [
  { offeringKind: "professional-program", allowsPlan: true, maxCount: 12 },
  { offeringKind: "professional-diploma", allowsPlan: true, maxCount: 6 },
  { offeringKind: "training-course", allowsPlan: false, maxCount: 0 },
]

describe("installment eligibility comes from configuration", () => {
  it("reads whether a product type allows a plan", () => {
    expect(allowsInstallments("professional-program", policy)).toBe(true)
    expect(allowsInstallments("professional-diploma", policy)).toBe(true)
    expect(allowsInstallments("training-course", policy)).toBe(false)
  })

  it("reads the configured maximum count", () => {
    expect(maxInstallmentCount("professional-program", policy)).toBe(12)
    expect(maxInstallmentCount("training-course", policy)).toBe(0)
  })

  it("treats an unconfigured kind as not permitted rather than defaulting open", () => {
    expect(allowsInstallments("professional-program", [])).toBe(false)
  })
})

describe("monthly schedule dates", () => {
  it("advances by whole months", () => {
    expect(addMonths("2026-01-15T00:00:00.000Z", 1)).toContain("2026-02-15")
    expect(addMonths("2026-01-15T00:00:00.000Z", 3)).toContain("2026-04-15")
  })

  it("clamps to the last valid day of a shorter month", () => {
    expect(addMonths("2026-01-31T00:00:00.000Z", 1)).toContain("2026-02-28")
  })

  it("crosses a year boundary", () => {
    expect(addMonths("2026-11-15T00:00:00.000Z", 3)).toContain("2027-02-15")
  })
})

describe("schedule construction", () => {
  it("numbers installments sequentially from one", () => {
    const schedule = buildSchedule({
      finalAmount: egp("1200.00"),
      count: 4,
      scheduleBasis: "monthly",
      firstDueDate: "2026-02-01T00:00:00.000Z",
    })
    expect(schedule.map((entry) => entry.sequence)).toEqual([1, 2, 3, 4])
  })

  it("sums exactly to the final amount for every count and awkward total", () => {
    for (const amount of ["1200.00", "1000.00", "999.99", "0.05", "7777.77"])
      for (let count = 1; count <= 12; count += 1) {
        const finalAmount = egp(amount)
        const schedule = buildSchedule({
          finalAmount,
          count,
          scheduleBasis: "monthly",
          firstDueDate: "2026-02-01T00:00:00.000Z",
        })
        expect(schedule).toHaveLength(count)
        expect(
          sum(
            schedule.map((entry) => entry.amount),
            "EGP",
            2
          ).amount
        ).toBe(finalAmount.amount)
      }
  })

  it("keeps earlier amounts uniform and puts the remainder last", () => {
    const schedule = buildSchedule({
      finalAmount: egp("100.00"),
      count: 3,
      scheduleBasis: "monthly",
      firstDueDate: "2026-02-01T00:00:00.000Z",
    })
    expect(schedule.map((entry) => entry.amount.amount)).toEqual([
      "33.33",
      "33.33",
      "33.34",
    ])
  })

  it("spaces monthly due dates a month apart", () => {
    const schedule = buildSchedule({
      finalAmount: egp("300.00"),
      count: 3,
      scheduleBasis: "monthly",
      firstDueDate: "2026-02-10T00:00:00.000Z",
    })
    expect(schedule[0]?.dueDate).toContain("2026-02-10")
    expect(schedule[1]?.dueDate).toContain("2026-03-10")
    expect(schedule[2]?.dueDate).toContain("2026-04-10")
  })

  it("honours custom due dates when supplied", () => {
    const custom = [
      "2026-03-01T00:00:00.000Z",
      "2026-07-01T00:00:00.000Z",
    ]
    const schedule = buildSchedule({
      finalAmount: egp("200.00"),
      count: 2,
      scheduleBasis: "custom",
      firstDueDate: "2026-03-01T00:00:00.000Z",
      customDueDates: custom,
    })
    expect(schedule.map((entry) => entry.dueDate)).toEqual(custom)
  })

  it("falls back to monthly spacing when custom dates do not match the count", () => {
    const schedule = buildSchedule({
      finalAmount: egp("300.00"),
      count: 3,
      scheduleBasis: "custom",
      firstDueDate: "2026-02-01T00:00:00.000Z",
      customDueDates: ["2026-02-01T00:00:00.000Z"],
    })
    expect(schedule).toHaveLength(3)
    expect(schedule[1]?.dueDate).toContain("2026-03-01")
  })
})

describe("plan request validation", () => {
  const base = {
    offeringKind: "professional-program" as const,
    policy,
    hasPaidInstallments: false,
  }

  it("accepts a permitted count", () => {
    expect(validatePlanRequest({ ...base, count: 6 })).toEqual({ ok: true })
  })

  it("refuses a product type that disallows plans", () => {
    expect(
      validatePlanRequest({ ...base, offeringKind: "training-course", count: 3 })
    ).toMatchObject({ ok: false, code: "installments-not-permitted" })
  })

  it("refuses a count above the configured maximum", () => {
    expect(validatePlanRequest({ ...base, count: 24 })).toMatchObject({
      ok: false,
      code: "validation-failed",
      maxCount: 12,
    })
  })

  it("refuses a non-positive or fractional count", () => {
    for (const count of [0, -1, 2.5])
      expect(validatePlanRequest({ ...base, count })).toMatchObject({
        ok: false,
        code: "validation-failed",
      })
  })

  it("refuses regeneration once an installment carries a payment", () => {
    expect(
      validatePlanRequest({ ...base, count: 6, hasPaidInstallments: true })
    ).toMatchObject({ ok: false, code: "plan-has-payments" })
  })

  it("checks the paid-installment guard before eligibility, so the message is the actionable one", () => {
    expect(
      validatePlanRequest({
        ...base,
        offeringKind: "training-course",
        count: 3,
        hasPaidInstallments: true,
      })
    ).toMatchObject({ code: "plan-has-payments" })
  })
})
