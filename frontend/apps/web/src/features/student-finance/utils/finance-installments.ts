import { allocate, type Money } from "@/shared/utils/money"
import type { OfferingKind, ScheduleBasis } from "../types/common"
import type { InstallmentEligibility } from "../types/domain"

/** Whether an academic product type permits installment plans (spec FR-013). */
export function eligibilityFor(
  offeringKind: OfferingKind,
  policy: readonly InstallmentEligibility[]
): InstallmentEligibility | undefined {
  return policy.find((entry) => entry.offeringKind === offeringKind)
}

export function allowsInstallments(
  offeringKind: OfferingKind,
  policy: readonly InstallmentEligibility[]
): boolean {
  return eligibilityFor(offeringKind, policy)?.allowsPlan ?? false
}

export function maxInstallmentCount(
  offeringKind: OfferingKind,
  policy: readonly InstallmentEligibility[]
): number {
  return eligibilityFor(offeringKind, policy)?.maxCount ?? 0
}

/** Adds whole months, clamping to the last valid day of the target month. */
export function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate)
  const targetDay = date.getUTCDate()
  const shifted = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  )
  const lastDay = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)
  ).getUTCDate()
  shifted.setUTCDate(Math.min(targetDay, lastDay))
  return shifted.toISOString()
}

export function addWeeks(isoDate: string, weeks: number): string {
  const date = new Date(isoDate)
  date.setUTCDate(date.getUTCDate() + weeks * 7)
  return date.toISOString()
}

export interface ScheduleEntry {
  sequence: number
  dueDate: string
  amount: Money
}

/**
 * Builds a schedule whose amounts sum **exactly** to the invoice final amount.
 * The exactness comes from `allocate`, which asserts its own sum before returning
 * (spec FR-011, SC-002).
 */
export function buildSchedule(input: {
  finalAmount: Money
  count: number
  scheduleBasis: ScheduleBasis
  firstDueDate: string
  /** Required when `scheduleBasis === "custom"`; must have `count` entries. */
  customDueDates?: readonly string[]
}): ScheduleEntry[] {
  const { finalAmount, count, scheduleBasis, firstDueDate, customDueDates } = input

  const amounts = allocate(finalAmount, count)
  const dueDates =
    scheduleBasis === "custom" && customDueDates?.length === count
      ? [...customDueDates]
      : Array.from({ length: count }, (_, index) =>
          scheduleBasis === "weekly"
            ? addWeeks(firstDueDate, index)
            : addMonths(firstDueDate, index * (scheduleBasis === "bimonthly" ? 2 : 1))
        )

  return amounts.map((amount, index) => ({
    sequence: index + 1,
    dueDate: dueDates[index] ?? addMonths(firstDueDate, index),
    amount,
  }))
}

export type PlanRefusal =
  | { ok: true }
  | {
      ok: false
      code: "installments-not-permitted" | "validation-failed" | "plan-has-payments"
      maxCount?: number
    }

export function validatePlanRequest(input: {
  offeringKind: OfferingKind
  count: number
  policy: readonly InstallmentEligibility[]
  /** True when any existing installment already carries a payment. */
  hasPaidInstallments: boolean
}): PlanRefusal {
  const { offeringKind, count, policy, hasPaidInstallments } = input

  // Regeneration must never orphan a recorded collection (spec FR-014).
  if (hasPaidInstallments) return { ok: false, code: "plan-has-payments" }
  if (!allowsInstallments(offeringKind, policy))
    return { ok: false, code: "installments-not-permitted" }

  const maxCount = maxInstallmentCount(offeringKind, policy)
  if (!Number.isInteger(count) || count < 1 || count > maxCount)
    return { ok: false, code: "validation-failed", maxCount }

  return { ok: true }
}
