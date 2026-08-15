import {
  clampToZero,
  compare,
  isNegative,
  max,
  min,
  multiplyByPercentage,
  subtract,
  zeroMoney,
  type Money,
} from "@/shared/utils/money"
import type { ReductionKind } from "../types/common"
import type { DiscountPolicy, InvoiceFigures } from "../types/domain"

export interface ReductionInput {
  kind: ReductionKind
  /** Percentage `0..100`, or a decimal amount. */
  value: string
}

/** Resolves a percentage-or-amount reduction against a base. */
export function resolveReduction(base: Money, input: ReductionInput): Money {
  const resolved =
    input.kind === "percentage"
      ? multiplyByPercentage(base, input.value)
      : { ...base, amount: input.value }
  // A reduction can never exceed its base or go negative.
  return min(max(clampToZero(resolved), zeroMoney(base.currency, base.precision)), base)
}

export interface ReductionComputation {
  totalAmount: Money
  scholarshipTotal: Money
  discountTotal: Money
  finalAmount: Money
}

/**
 * The single authoritative reduction order: **scholarship against the tuition base
 * first, then discount against the remainder** (spec FR-024, research R4).
 *
 * This one function is used by the invoice editor's live preview, the Zod schemas,
 * and the service, so the previewed number and the saved number can never differ.
 * Reversing the order is a change confined to this function plus its tests.
 */
export function computeFigures(
  totalAmount: Money,
  scholarship?: ReductionInput,
  discount?: ReductionInput
): ReductionComputation {
  const zero = zeroMoney(totalAmount.currency, totalAmount.precision)

  const scholarshipTotal = scholarship
    ? resolveReduction(totalAmount, scholarship)
    : zero
  const afterScholarship = subtract(totalAmount, scholarshipTotal)

  const discountTotal = discount
    ? resolveReduction(afterScholarship, discount)
    : zero
  const finalAmount = clampToZero(subtract(afterScholarship, discountTotal))

  return { totalAmount, scholarshipTotal, discountTotal, finalAmount }
}

export function toInvoiceFigures(
  computation: ReductionComputation
): InvoiceFigures {
  return {
    totalAmount: computation.totalAmount,
    discountTotal: computation.discountTotal,
    scholarshipTotal: computation.scholarshipTotal,
    finalAmount: computation.finalAmount,
  }
}

export type ReductionRefusal =
  | { ok: true; amount: Money }
  | {
      ok: false
      code: "reduction-exceeds-limit" | "reduction-below-collected" | "negative-amount"
      limit?: string
      collected?: string
    }

/**
 * Validates a reduction against the configured limit and both floors: the final
 * amount may not go negative, and the balance may not drop below what has already
 * been collected (spec FR-022).
 */
export function validateReduction(input: {
  base: Money
  reduction: ReductionInput
  policy: Pick<DiscountPolicy, "maxPercentage" | "maxAmount">
  /** Net amount already collected on this invoice. */
  collected: Money
  /** Current final amount before this reduction. */
  currentFinal: Money
}): ReductionRefusal {
  const { base, reduction, policy, collected, currentFinal } = input

  if (reduction.kind === "percentage") {
    const percent = Number(reduction.value)
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100)
      return { ok: false, code: "negative-amount" }
    if (percent > Number(policy.maxPercentage))
      return {
        ok: false,
        code: "reduction-exceeds-limit",
        limit: policy.maxPercentage,
      }
  }

  const amount = resolveReduction(base, reduction)
  if (isNegative(amount) || compare(amount, zeroMoney(base.currency, base.precision)) === 0)
    return { ok: false, code: "negative-amount" }

  if (
    reduction.kind === "amount" &&
    policy.maxAmount &&
    compare(amount, policy.maxAmount) > 0
  )
    return {
      ok: false,
      code: "reduction-exceeds-limit",
      limit: policy.maxAmount.amount,
    }

  // The resulting final amount must still cover what has already been collected.
  const resultingFinal = clampToZero(subtract(currentFinal, amount))
  if (compare(resultingFinal, collected) < 0)
    return {
      ok: false,
      code: "reduction-below-collected",
      collected: collected.amount,
    }

  return { ok: true, amount }
}
