import {
  add,
  compare,
  makeMoney,
  parseAmount,
  sum,
  zeroMoney,
  type Money,
} from "@/shared/utils/money"
import type { FinancialProfile, InstallmentPlan } from "../types/domain"

/**
 * Batch money mechanics.
 *
 * Every figure is computed in **integer minor units**. The previous version read
 * `Number(...)` off each amount, summed the floats, and compared the result with
 * `Math.abs(total - expected) < 0.01` — an epsilon that existed only to absorb
 * the drift those floats introduced. It also accepted a plan that was up to a
 * whole minor unit out, which on an installment schedule shown to a student is a
 * real discrepancy rather than a rounding artifact.
 *
 * Here a plan either accounts for its charge exactly or it does not.
 */

export const BATCH_CURRENCY = "EGP"
export const BATCH_PRECISION = 2

/** Builds a batch `Money` from a decimal string. */
export function batchMoney(amount: string): Money {
  return makeMoney(amount, BATCH_CURRENCY, BATCH_PRECISION)
}

/** A fresh zero, so form defaults never share one object. */
export function zeroBatchMoney(): Money {
  return zeroMoney(BATCH_CURRENCY, BATCH_PRECISION)
}

const moneyLike = (value: string, reference: Money): Money =>
  makeMoney(value, reference.currency, reference.precision)

/** The plan's installment total, in the currency of the charge it covers. */
export function planTotal(plan: InstallmentPlan, reference: Money): Money {
  return sum(
    plan.installments.map((item) => moneyLike(item.value, reference)),
    reference.currency,
    reference.precision
  )
}

/** The charge an installment plan is meant to cover, in full. */
export function coveredAmount(
  profile: FinancialProfile,
  plan: InstallmentPlan
): Money {
  const price = profile.programPrice
  const fee = profile.registrationFee
  if (plan.coveredCharge === "program-price") return price
  if (plan.coveredCharge === "registration-fee") return fee
  return add(price, fee)
}

/**
 * Whether a plan's installments account for exactly the charge they cover.
 *
 * A `percentage` plan's values are percentages rather than money, so they are
 * summed as integers scaled to two decimals — which is what makes
 * `33.33 + 33.33 + 33.34` resolve to exactly 100, as it does not in binary
 * floating point.
 */
export function isPlanBalanced(
  profile: FinancialProfile,
  plan: InstallmentPlan
): boolean {
  if (plan.basis === "percentage") {
    const totalScaled = plan.installments.reduce(
      (carried, item) => carried + parseAmount(item.value, 2),
      0
    )
    return totalScaled === parseAmount("100", 2)
  }

  const reference = profile.programPrice
  return compare(planTotal(plan, reference), coveredAmount(profile, plan)) === 0
}
