/**
 * Shared money value mechanics.
 *
 * A `Money` carries a **decimal string** amount so nothing is lost at a boundary,
 * and every operation converts to **integer minor units**, computes with integers,
 * and converts back. No floating-point operator ever touches a money value:
 * `0.1 + 0.2 !== 0.3` in binary floating point, and repeated operations accumulate
 * drift that is invisible until a balance disagrees with its records.
 *
 * Business policy — how reductions combine, how a balance is derived — lives in the
 * owning feature. Only value mechanics live here.
 */

export interface Money {
  amount: string
  currency: string
  precision: number
}

export class MoneyCurrencyMismatchError extends Error {
  constructor(left: string, right: string) {
    super(`cannot combine ${left} with ${right}`)
    this.name = "MoneyCurrencyMismatchError"
  }
}

export class MoneyAllocationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MoneyAllocationError"
  }
}

const scale = (precision: number) => 10 ** precision

/**
 * Parses a decimal string into integer minor units without going through a float.
 * `"12.34"` at precision 2 becomes `1234`.
 */
export function parseAmount(amount: string, precision: number): number {
  const trimmed = amount.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed))
    throw new Error(`invalid decimal amount: ${amount}`)

  const negative = trimmed.startsWith("-")
  const unsigned = negative ? trimmed.slice(1) : trimmed
  const [whole = "0", fraction = ""] = unsigned.split(".")

  // Pad or truncate the fraction to exactly `precision` digits, rounding half-up
  // on the first dropped digit rather than relying on Number rounding.
  const padded = fraction.padEnd(precision + 1, "0")
  const kept = padded.slice(0, precision)
  const nextDigit = Number(padded[precision] ?? "0")

  let minor = Number(whole) * scale(precision) + Number(kept || "0")
  if (nextDigit >= 5) minor += 1
  return negative ? -minor : minor
}

export function toMinor(value: Money): number {
  return parseAmount(value.amount, value.precision)
}

export function fromMinor(
  minor: number,
  currency: string,
  precision: number
): Money {
  const rounded = Math.round(minor)
  const negative = rounded < 0
  const absolute = Math.abs(rounded)
  const whole = Math.trunc(absolute / scale(precision))
  const fraction = absolute % scale(precision)
  const amount =
    precision === 0
      ? String(whole)
      : `${whole}.${String(fraction).padStart(precision, "0")}`
  return { amount: negative ? `-${amount}` : amount, currency, precision }
}

export function makeMoney(
  amount: string | number,
  currency: string,
  precision: number
): Money {
  const text = typeof amount === "number" ? amount.toFixed(precision) : amount
  return fromMinor(parseAmount(text, precision), currency, precision)
}

export function zeroMoney(currency: string, precision: number): Money {
  return fromMinor(0, currency, precision)
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency)
    throw new MoneyCurrencyMismatchError(left.currency, right.currency)
}

export function add(left: Money, right: Money): Money {
  assertSameCurrency(left, right)
  return fromMinor(toMinor(left) + toMinor(right), left.currency, left.precision)
}

export function subtract(left: Money, right: Money): Money {
  assertSameCurrency(left, right)
  return fromMinor(toMinor(left) - toMinor(right), left.currency, left.precision)
}

export function sum(
  values: readonly Money[],
  currency: string,
  precision: number
): Money {
  return values.reduce((total, value) => add(total, value), zeroMoney(currency, precision))
}

/** Percentage as a decimal string, e.g. `"12.5"` for 12.5%. Rounds half-up. */
export function multiplyByPercentage(value: Money, percentage: string): Money {
  const minor = toMinor(value)
  // Percentage is scaled by 100 so a fractional percent stays integral.
  const scaledPercent = parseAmount(percentage, 2)
  const product = (minor * scaledPercent) / (100 * 100)
  return fromMinor(Math.round(product), value.currency, value.precision)
}

export function compare(left: Money, right: Money): number {
  assertSameCurrency(left, right)
  return toMinor(left) - toMinor(right)
}

export const isZero = (value: Money) => toMinor(value) === 0
export const isNegative = (value: Money) => toMinor(value) < 0
export const isPositive = (value: Money) => toMinor(value) > 0

export function min(left: Money, right: Money): Money {
  return compare(left, right) <= 0 ? left : right
}

export function max(left: Money, right: Money): Money {
  return compare(left, right) >= 0 ? left : right
}

/** Clamps to zero so a derived balance can never present as negative. */
export function clampToZero(value: Money): Money {
  return isNegative(value) ? zeroMoney(value.currency, value.precision) : value
}

/**
 * Splits a total into `count` parts whose sum is **exactly** the total.
 *
 * The remainder goes to the final part so every earlier amount stays uniform,
 * which is what an installment schedule shown to a student should look like.
 * The exact-sum assertion makes an allocation bug fail here rather than surfacing
 * later as a one-minor-unit discrepancy in a balance.
 */
export function allocate(total: Money, count: number): Money[] {
  if (!Number.isInteger(count) || count < 1)
    throw new MoneyAllocationError(`installment count must be >= 1, got ${count}`)

  const totalMinor = toMinor(total)
  const base = Math.trunc(totalMinor / count)
  const remainder = totalMinor - base * count

  const parts: Money[] = []
  for (let index = 0; index < count; index += 1) {
    const isLast = index === count - 1
    parts.push(
      fromMinor(isLast ? base + remainder : base, total.currency, total.precision)
    )
  }

  const allocated = parts.reduce((carried, part) => carried + toMinor(part), 0)
  if (allocated !== totalMinor)
    throw new MoneyAllocationError(
      `allocation lost ${totalMinor - allocated} minor units splitting ${total.amount} into ${count}`
    )

  return parts
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function formatter(currency: string, precision: number): Intl.NumberFormat {
  const key = `${currency}:${precision}`
  let cached = formatterCache.get(key)
  if (!cached) {
    cached = new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
    formatterCache.set(key, cached)
  }
  return cached
}

export function formatMoney(value: Money): string {
  return formatter(value.currency, value.precision).format(Number(value.amount))
}

/** Plain digits with no currency symbol, for inputs and CSV export. */
export function formatAmount(value: Money): string {
  return value.amount
}
