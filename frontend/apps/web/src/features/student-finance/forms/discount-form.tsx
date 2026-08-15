"use client"

import { useMemo } from "react"
import type { Money } from "@/shared/utils/money"
import type { ReductionKind } from "../types/common"
import type { DiscountPolicy } from "../types/domain"
import { discountCopy } from "../config/finance-copy"
import { computeFigures, resolveReduction } from "../utils/finance-reductions"
import { createReductionSchema } from "../schemas/finance-schemas"
import { MoneyValue } from "../components/money-value"

export interface DiscountValues {
  kind: ReductionKind
  value: string
  reason: string
}

export const emptyDiscountValues: DiscountValues = {
  kind: "percentage",
  value: "",
  reason: "",
}

export interface DiscountLimits {
  /**
   * What the reduction resolves against, and what it is subtracted from to get
   * the new final amount. Pre-issuance that is the tuition base after any
   * scholarship (the discount replaces the one on the draft); post-issuance it is
   * the current balance (the adjustment stacks). The service uses exactly this
   * base, which is what keeps the preview and the saved figure identical.
   */
  base: Money
  /** Current final amount, used for the already-collected floor. */
  currentFinal: Money
  collected: Money
  policy: DiscountPolicy
}

/**
 * Validates against the same schema the service enforces, so the form can never
 * accept a reduction the service would refuse.
 */
export function validateDiscount(
  values: DiscountValues,
  limits: DiscountLimits
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const parsed = createReductionSchema(limits).safeParse(values)
  if (parsed.success) return { ok: true }

  const errors: Record<string, string> = {}
  for (const issue of parsed.error.issues)
    errors[issue.path.join(".")] ??= issue.message
  return { ok: false, errors }
}

const isDecimalInput = (value: string) => /^\d+(\.\d+)?$/.test(value.trim())

/**
 * Fields for applying a discount, with a live preview of the resulting amount.
 *
 * The preview runs the very same `computeFigures` the service runs, so the number
 * shown before confirming is exactly the number that gets saved — no second
 * rounding path that could disagree at the last decimal place.
 */
export function DiscountForm({
  idPrefix,
  values,
  errors,
  limits,
  firstFieldRef,
  onChange,
}: {
  idPrefix: string
  values: DiscountValues
  errors: Record<string, string>
  limits: DiscountLimits
  firstFieldRef?: React.Ref<HTMLInputElement>
  onChange: (next: DiscountValues) => void
}) {
  const preview = useMemo(() => {
    if (!isDecimalInput(values.value)) return undefined
    const reduction = { kind: values.kind, value: values.value.trim() }
    // The same `computeFigures` the service runs — no second rounding path.
    const computation = computeFigures(limits.base, undefined, reduction)
    return {
      amount: resolveReduction(limits.base, reduction),
      resulting: computation.finalAmount,
    }
  }, [values.kind, values.value, limits.base])

  const set = (patch: Partial<DiscountValues>) =>
    onChange({ ...values, ...patch })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-kind`} className="text-sm font-medium">
          {discountCopy.kind}
        </label>
        <select
          id={`${idPrefix}-kind`}
          value={values.kind}
          onChange={(event) => set({ kind: event.target.value as ReductionKind })}
          className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
        >
          <option value="percentage">{discountCopy.percentage}</option>
          <option value="amount">{discountCopy.amount}</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-value`} className="text-sm font-medium">
          {discountCopy.value}
          {" — "}
          {discountCopy.limitHint}{" "}
          {values.kind === "percentage" ? (
            <span dir="ltr">{limits.policy.maxPercentage}%</span>
          ) : (
            <MoneyValue value={limits.base} />
          )}
        </label>
        <input
          id={`${idPrefix}-value`}
          ref={firstFieldRef}
          inputMode="decimal"
          dir="ltr"
          value={values.value}
          onChange={(event) => set({ value: event.target.value })}
          aria-invalid={Boolean(errors.value)}
          aria-describedby={errors.value ? `${idPrefix}-value-error` : undefined}
          className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-start outline-none focus-visible:ring-2"
        />
        {errors.value && (
          <p
            id={`${idPrefix}-value-error`}
            role="alert"
            className="text-destructive text-sm"
          >
            {errors.value}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-reason`} className="text-sm font-medium">
          {discountCopy.reason}
        </label>
        <textarea
          id={`${idPrefix}-reason`}
          rows={2}
          value={values.reason}
          onChange={(event) => set({ reason: event.target.value })}
          aria-invalid={Boolean(errors.reason)}
          aria-describedby={errors.reason ? `${idPrefix}-reason-error` : undefined}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
        />
        {errors.reason && (
          <p
            id={`${idPrefix}-reason-error`}
            role="alert"
            className="text-destructive text-sm"
          >
            {errors.reason}
          </p>
        )}
      </div>

      {preview && (
        <dl className="bg-muted/40 grid gap-2 rounded-lg p-3 text-sm sm:grid-cols-3">
          <Figure label="القيمة قبل الخصم" value={limits.base} />
          <Figure label="قيمة الخصم" value={preview.amount} />
          <Figure
            label="القيمة بعد الخصم"
            value={preview.resulting}
            testId="discount-preview-final"
          />
        </dl>
      )}
    </div>
  )
}

function Figure({
  label,
  value,
  testId,
}: {
  label: string
  value: Money
  testId?: string
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 font-medium" data-testid={testId}>
        <MoneyValue value={value} />
      </dd>
    </div>
  )
}
