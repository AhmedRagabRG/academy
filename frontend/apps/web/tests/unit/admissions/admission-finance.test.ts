import { describe, expect, it } from "vitest"
import {
  calculateAdmissionMoney,
  toMinorUnits,
} from "@/features/admissions/utils/admission-money"

const money = (amount: string) => ({ amount, currency: "EGP", precision: 2 })

describe("admission money", () => {
  it("uses integer minor units and derives percentage discounts", () => {
    expect(toMinorUnits("10.235", 2)).toBe(1024)
    const result = calculateAdmissionMoney({
      price: money("1000.00"),
      fees: money("100.00"),
      mode: "percentage",
      value: "10",
    })
    expect(result.discountAmount.amount).toBe("100.00")
    expect(result.requiredAmount.amount).toBe("1000.00")
  })

  it("rejects discounts above the product price", () => {
    expect(() =>
      calculateAdmissionMoney({
        price: money("100.00"),
        fees: money("0"),
        mode: "amount",
        value: "101",
      })
    ).toThrow("discount-invalid")
  })
})
