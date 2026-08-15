import { describe, expect, it } from "vitest"
import {
  add,
  allocate,
  clampToZero,
  compare,
  formatAmount,
  fromMinor,
  isNegative,
  isZero,
  makeMoney,
  max,
  min,
  MoneyAllocationError,
  MoneyCurrencyMismatchError,
  multiplyByPercentage,
  parseAmount,
  subtract,
  sum,
  toMinor,
  zeroMoney,
} from "@/shared/utils/money"

const egp = (amount: string) => makeMoney(amount, "EGP", 2)

describe("decimal parsing", () => {
  it("parses whole and fractional amounts into minor units", () => {
    expect(parseAmount("12.34", 2)).toBe(1234)
    expect(parseAmount("12", 2)).toBe(1200)
    expect(parseAmount("0.05", 2)).toBe(5)
  })

  it("handles negatives", () => {
    expect(parseAmount("-12.34", 2)).toBe(-1234)
  })

  it("rounds half-up on the first dropped digit", () => {
    expect(parseAmount("12.345", 2)).toBe(1235)
    expect(parseAmount("12.344", 2)).toBe(1234)
  })

  it("supports zero precision", () => {
    expect(parseAmount("120", 0)).toBe(120)
  })

  it("rejects a malformed amount rather than silently coercing", () => {
    expect(() => parseAmount("12.3.4", 2)).toThrow()
    expect(() => parseAmount("abc", 2)).toThrow()
    expect(() => parseAmount("", 2)).toThrow()
  })
})

describe("round tripping", () => {
  it("survives conversion in both directions", () => {
    for (const amount of ["0.00", "0.01", "9.99", "1234.56", "999999.99"]) {
      const money = egp(amount)
      expect(money.amount).toBe(amount)
      expect(fromMinor(toMinor(money), "EGP", 2).amount).toBe(amount)
    }
  })

  it("pads the fraction to the configured precision", () => {
    expect(egp("5").amount).toBe("5.00")
    expect(egp("5.1").amount).toBe("5.10")
  })
})

describe("arithmetic exactness", () => {
  it("adds amounts that float arithmetic gets wrong", () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point.
    expect(add(egp("0.10"), egp("0.20")).amount).toBe("0.30")
  })

  it("subtracts without drift", () => {
    expect(subtract(egp("1000.00"), egp("999.99")).amount).toBe("0.01")
  })

  it("stays exact across many repeated operations", () => {
    let total = zeroMoney("EGP", 2)
    for (let index = 0; index < 1000; index += 1) total = add(total, egp("0.01"))
    expect(total.amount).toBe("10.00")
  })

  it("sums a list exactly", () => {
    const values = ["33.33", "33.33", "33.34"].map(egp)
    expect(sum(values, "EGP", 2).amount).toBe("100.00")
  })

  it("refuses to combine different currencies", () => {
    expect(() => add(egp("1.00"), makeMoney("1.00", "USD", 2))).toThrow(
      MoneyCurrencyMismatchError
    )
    expect(() => subtract(egp("1.00"), makeMoney("1.00", "USD", 2))).toThrow(
      MoneyCurrencyMismatchError
    )
  })
})

describe("percentage", () => {
  it("applies a whole percentage", () => {
    expect(multiplyByPercentage(egp("200.00"), "10").amount).toBe("20.00")
  })

  it("applies a fractional percentage", () => {
    expect(multiplyByPercentage(egp("200.00"), "12.5").amount).toBe("25.00")
  })

  it("rounds half-up at the configured precision", () => {
    expect(multiplyByPercentage(egp("0.05"), "50").amount).toBe("0.03")
  })

  it("returns zero for a zero percentage", () => {
    expect(isZero(multiplyByPercentage(egp("200.00"), "0"))).toBe(true)
  })
})

describe("comparison helpers", () => {
  it("compares, minimizes, and maximizes", () => {
    expect(compare(egp("5.00"), egp("3.00"))).toBeGreaterThan(0)
    expect(compare(egp("3.00"), egp("5.00"))).toBeLessThan(0)
    expect(compare(egp("5.00"), egp("5.00"))).toBe(0)
    expect(min(egp("5.00"), egp("3.00")).amount).toBe("3.00")
    expect(max(egp("5.00"), egp("3.00")).amount).toBe("5.00")
  })

  it("detects zero and negative", () => {
    expect(isZero(egp("0.00"))).toBe(true)
    expect(isNegative(egp("-0.01"))).toBe(true)
    expect(isNegative(egp("0.00"))).toBe(false)
  })

  it("clamps a negative to zero so a balance never presents as negative", () => {
    expect(clampToZero(egp("-50.00")).amount).toBe("0.00")
    expect(clampToZero(egp("50.00")).amount).toBe("50.00")
  })
})

describe("allocation", () => {
  it("splits evenly when it divides", () => {
    const parts = allocate(egp("300.00"), 3)
    expect(parts.map(formatAmount)).toEqual(["100.00", "100.00", "100.00"])
  })

  it("puts the remainder on the final part", () => {
    const parts = allocate(egp("100.00"), 3)
    expect(parts.map(formatAmount)).toEqual(["33.33", "33.33", "33.34"])
  })

  it("sums exactly to the total for every count and awkward amount", () => {
    const amounts = ["100.00", "0.01", "0.05", "999.99", "1234.57", "7777.77"]
    for (const amount of amounts)
      for (let count = 1; count <= 24; count += 1) {
        const total = egp(amount)
        const parts = allocate(total, count)
        expect(parts).toHaveLength(count)
        expect(sum(parts, "EGP", 2).amount).toBe(total.amount)
      }
  })

  it("handles a single installment", () => {
    expect(allocate(egp("123.45"), 1).map(formatAmount)).toEqual(["123.45"])
  })

  it("handles a total smaller than the installment count", () => {
    const parts = allocate(egp("0.02"), 5)
    expect(sum(parts, "EGP", 2).amount).toBe("0.02")
    expect(parts.filter((part) => !isZero(part))).toHaveLength(1)
  })

  it("allocates zero without error", () => {
    expect(sum(allocate(egp("0.00"), 4), "EGP", 2).amount).toBe("0.00")
  })

  it("rejects an invalid count rather than producing a broken schedule", () => {
    expect(() => allocate(egp("100.00"), 0)).toThrow(MoneyAllocationError)
    expect(() => allocate(egp("100.00"), -3)).toThrow(MoneyAllocationError)
    expect(() => allocate(egp("100.00"), 2.5)).toThrow(MoneyAllocationError)
  })
})

describe("zero precision currencies", () => {
  it("allocates without a fractional part", () => {
    const total = makeMoney("100", "JPY", 0)
    const parts = allocate(total, 3)
    expect(parts.map(formatAmount)).toEqual(["33", "33", "34"])
    expect(sum(parts, "JPY", 0).amount).toBe("100")
  })
})
