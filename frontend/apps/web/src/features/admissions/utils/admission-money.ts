import type { Money } from "../types/common"

const factor = (precision: number) => 10 ** precision
export const toMinorUnits = (value: string, precision: number) =>
  Math.round(Number(value || 0) * factor(precision))
export const fromMinorUnits = (value: number, precision: number) =>
  (value / factor(precision)).toFixed(precision)

export function calculateAdmissionMoney({
  price,
  fees,
  mode,
  value,
}: {
  price: Money
  fees: Money
  mode: "none" | "percentage" | "amount"
  value: string
}) {
  if (price.currency !== fees.currency || price.precision !== fees.precision)
    throw new Error("currency-mismatch")
  const priceMinor = toMinorUnits(price.amount, price.precision)
  const feesMinor = toMinorUnits(fees.amount, fees.precision)
  let discountMinor = 0
  let percentage = 0
  if (mode === "percentage") {
    percentage = Number(value)
    discountMinor = Math.round((priceMinor * percentage) / 100)
  }
  if (mode === "amount") {
    discountMinor = toMinorUnits(value, price.precision)
    percentage = priceMinor ? (discountMinor / priceMinor) * 100 : 0
  }
  if (
    !Number.isFinite(discountMinor) ||
    discountMinor < 0 ||
    discountMinor > priceMinor ||
    percentage < 0 ||
    percentage > 100
  )
    throw new Error("discount-invalid")
  const requiredMinor = Math.max(0, priceMinor - discountMinor + feesMinor)
  const money = (amount: number): Money => ({
    amount: fromMinorUnits(amount, price.precision),
    currency: price.currency,
    precision: price.precision,
  })
  return {
    discountPercentage: percentage.toFixed(2),
    discountAmount: money(discountMinor),
    requiredAmount: money(requiredMinor),
  }
}
