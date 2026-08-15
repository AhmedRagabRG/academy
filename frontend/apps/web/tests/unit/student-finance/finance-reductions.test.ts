import { describe, expect, it } from "vitest"
import {
  computeFigures,
  resolveReduction,
  validateReduction,
} from "@/features/student-finance/utils/finance-reductions"
import { makeMoney } from "@/shared/utils/money"

const egp = (amount: string) => makeMoney(amount, "EGP", 2)
const policy = { maxPercentage: "50", maxAmount: egp("5000.00") }

describe("resolving a reduction", () => {
  it("resolves a percentage against the base", () => {
    expect(resolveReduction(egp("1000.00"), { kind: "percentage", value: "10" }).amount).toBe("100.00")
  })

  it("resolves a fixed amount", () => {
    expect(resolveReduction(egp("1000.00"), { kind: "amount", value: "250.00" }).amount).toBe("250.00")
  })

  it("never exceeds its base", () => {
    expect(resolveReduction(egp("100.00"), { kind: "amount", value: "500.00" }).amount).toBe("100.00")
    expect(resolveReduction(egp("100.00"), { kind: "percentage", value: "150" }).amount).toBe("100.00")
  })

  it("never goes negative", () => {
    expect(resolveReduction(egp("100.00"), { kind: "amount", value: "-50.00" }).amount).toBe("0.00")
  })
})

describe("reduction ordering", () => {
  it("applies scholarship to the base, then discount to the remainder", () => {
    // 1000 − 20% scholarship = 800; 800 − 10% discount = 720
    const figures = computeFigures(
      egp("1000.00"),
      { kind: "percentage", value: "20" },
      { kind: "percentage", value: "10" }
    )
    expect(figures.scholarshipTotal.amount).toBe("200.00")
    expect(figures.discountTotal.amount).toBe("80.00")
    expect(figures.finalAmount.amount).toBe("720.00")
  })

  it("differs from applying both to the original base — the order matters", () => {
    const ordered = computeFigures(
      egp("1000.00"),
      { kind: "percentage", value: "20" },
      { kind: "percentage", value: "10" }
    )
    // Both against the original base would give 1000 − 200 − 100 = 700.
    expect(ordered.finalAmount.amount).not.toBe("700.00")
    expect(ordered.finalAmount.amount).toBe("720.00")
  })

  it("is deterministic across repeated computation", () => {
    const once = computeFigures(egp("1234.57"), { kind: "percentage", value: "33.33" }, { kind: "amount", value: "100.00" })
    const twice = computeFigures(egp("1234.57"), { kind: "percentage", value: "33.33" }, { kind: "amount", value: "100.00" })
    expect(once).toEqual(twice)
  })

  it("handles a scholarship alone", () => {
    const figures = computeFigures(egp("500.00"), { kind: "percentage", value: "50" })
    expect(figures.finalAmount.amount).toBe("250.00")
    expect(figures.discountTotal.amount).toBe("0.00")
  })

  it("handles a discount alone", () => {
    const figures = computeFigures(egp("500.00"), undefined, { kind: "amount", value: "125.00" })
    expect(figures.finalAmount.amount).toBe("375.00")
    expect(figures.scholarshipTotal.amount).toBe("0.00")
  })

  it("handles no reduction at all", () => {
    const figures = computeFigures(egp("500.00"))
    expect(figures.finalAmount.amount).toBe("500.00")
  })

  it("reaches exactly zero for full-tuition coverage, never negative", () => {
    const figures = computeFigures(egp("800.00"), { kind: "percentage", value: "100" })
    expect(figures.finalAmount.amount).toBe("0.00")
  })

  it("cannot go negative when both reductions are large", () => {
    const figures = computeFigures(
      egp("1000.00"),
      { kind: "percentage", value: "100" },
      { kind: "amount", value: "500.00" }
    )
    expect(figures.finalAmount.amount).toBe("0.00")
    // The discount had nothing left to reduce.
    expect(figures.discountTotal.amount).toBe("0.00")
  })

  it("keeps figures exact for amounts that do not divide cleanly", () => {
    const figures = computeFigures(egp("333.33"), { kind: "percentage", value: "33.33" })
    const expected = Number(figures.totalAmount.amount) - Number(figures.scholarshipTotal.amount)
    expect(Number(figures.finalAmount.amount)).toBeCloseTo(expected, 2)
  })
})

describe("reduction validation", () => {
  const base = egp("1000.00")

  it("accepts a reduction within the limit", () => {
    expect(
      validateReduction({
        base,
        reduction: { kind: "percentage", value: "10" },
        policy,
        collected: egp("0.00"),
        currentFinal: base,
      })
    ).toMatchObject({ ok: true })
  })

  it("refuses a percentage above the configured limit", () => {
    expect(
      validateReduction({
        base,
        reduction: { kind: "percentage", value: "80" },
        policy,
        collected: egp("0.00"),
        currentFinal: base,
      })
    ).toMatchObject({ ok: false, code: "reduction-exceeds-limit", limit: "50" })
  })

  it("refuses a percentage outside 0..100", () => {
    for (const value of ["0", "-5", "150"])
      expect(
        validateReduction({
          base,
          reduction: { kind: "percentage", value },
          policy,
          collected: egp("0.00"),
          currentFinal: base,
        })
      ).toMatchObject({ ok: false })
  })

  it("refuses a fixed amount above the configured ceiling", () => {
    expect(
      validateReduction({
        base: egp("20000.00"),
        reduction: { kind: "amount", value: "9000.00" },
        policy,
        collected: egp("0.00"),
        currentFinal: egp("20000.00"),
      })
    ).toMatchObject({ ok: false, code: "reduction-exceeds-limit" })
  })

  it("refuses a reduction that would drop the balance below what was collected", () => {
    expect(
      validateReduction({
        base,
        reduction: { kind: "amount", value: "600.00" },
        policy,
        collected: egp("500.00"),
        currentFinal: base,
      })
    ).toMatchObject({ ok: false, code: "reduction-below-collected", collected: "500.00" })
  })

  it("accepts a reduction that lands exactly on the collected amount", () => {
    expect(
      validateReduction({
        base,
        reduction: { kind: "amount", value: "500.00" },
        policy,
        collected: egp("500.00"),
        currentFinal: base,
      })
    ).toMatchObject({ ok: true })
  })

  it("refuses a zero or negative reduction", () => {
    expect(
      validateReduction({
        base,
        reduction: { kind: "amount", value: "0.00" },
        policy,
        collected: egp("0.00"),
        currentFinal: base,
      })
    ).toMatchObject({ ok: false, code: "negative-amount" })
  })
})
