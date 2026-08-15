"use client"

import { zeroMoney, type Money } from "@/shared/utils/money"
import type { ReductionKind, ScholarshipCoverage } from "../types/common"
import type { ScholarshipPolicy } from "../types/domain"
import type { EnrollmentBalance } from "../types/projections"
import { scholarshipCopy } from "../config/finance-copy"
import { createReductionSchema } from "../schemas/finance-schemas"

export interface ScholarshipValues {
  name: string
  kind: ReductionKind
  value: string
  coverage: ScholarshipCoverage
  reason: string
  /** Empty means every enrollment. */
  enrollmentId: string
}

export const emptyScholarshipValues: ScholarshipValues = {
  name: "",
  kind: "percentage",
  value: "",
  coverage: "partial-tuition",
  reason: "",
  enrollmentId: "",
}

export interface ScholarshipLimits {
  /** Tuition base the award is expressed against. */
  base: Money
  policy: ScholarshipPolicy
}

/**
 * Validates against the same schema the service enforces.
 *
 * Full coverage carries no figure to validate — it is the whole tuition by
 * definition — so only the value of a partial award is range-checked.
 *
 * The already-collected floor is deliberately **not** checked here. An award is
 * student-wide or enrollment-wide, and the service applies it per invoice,
 * clamping each reduction to that invoice's own headroom. Checking an aggregate
 * floor in the form would refuse awards the service would accept, which is the
 * one way a form can be wrong that a user cannot work around.
 */
export function validateScholarship(
  values: ScholarshipValues,
  limits: ScholarshipLimits
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const schema = createReductionSchema({
    base: limits.base,
    currentFinal: limits.base,
    collected: zeroMoney(limits.base.currency, limits.base.precision),
    policy: { maxPercentage: limits.policy.maxPercentage },
    requireName: true,
  })
  const candidate =
    values.coverage === "full-tuition"
      ? { ...values, kind: "percentage" as const, value: "100" }
      : values
  const parsed = schema.safeParse(candidate)
  if (parsed.success) return { ok: true }

  const errors: Record<string, string> = {}
  for (const issue of parsed.error.issues)
    errors[issue.path.join(".")] ??= issue.message
  return { ok: false, errors }
}

/**
 * Fields for awarding a scholarship: name, coverage, value, scope, and reason.
 *
 * Choosing full coverage hides the value field rather than leaving a control that
 * has no effect — the figure is not "100 that you may edit", it is "all of it".
 */
export function ScholarshipForm({
  idPrefix,
  values,
  errors,
  policy,
  enrollments,
  firstFieldRef,
  onChange,
}: {
  idPrefix: string
  values: ScholarshipValues
  errors: Record<string, string>
  policy: ScholarshipPolicy
  enrollments: readonly EnrollmentBalance[]
  firstFieldRef?: React.Ref<HTMLInputElement>
  onChange: (next: ScholarshipValues) => void
}) {
  const set = (patch: Partial<ScholarshipValues>) =>
    onChange({ ...values, ...patch })

  // Full coverage is a 100% reduction. If the configured cap is lower, the option
  // is shown as unavailable rather than offered and then refused on submit.
  const fullCoverageAllowed = Number(policy.maxPercentage) >= 100

  const field = (name: keyof ScholarshipValues) => ({
    id: `${idPrefix}-${name}`,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${idPrefix}-${name}-error` : undefined,
  })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">
          {scholarshipCopy.name}
        </label>
        <input
          {...field("name")}
          ref={firstFieldRef}
          value={values.name}
          onChange={(event) => set({ name: event.target.value })}
          className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
        />
        <FieldError id={`${idPrefix}-name-error`} message={errors.name} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {scholarshipCopy.coverage}
        </legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["partial-tuition", scholarshipCopy.partialTuition],
              ["full-tuition", scholarshipCopy.fullTuition],
            ] as const
          ).map(([coverage, label]) => {
            const disabled = coverage === "full-tuition" && !fullCoverageAllowed
            return (
              <label
                key={coverage}
                className={
                  disabled
                    ? "text-muted-foreground flex items-center gap-2 text-sm"
                    : "flex items-center gap-2 text-sm"
                }
              >
                <input
                  type="radio"
                  name={`${idPrefix}-coverage`}
                  value={coverage}
                  checked={values.coverage === coverage}
                  disabled={disabled}
                  onChange={() => set({ coverage })}
                />
                {label}
              </label>
            )
          })}
        </div>
        {!fullCoverageAllowed && (
          <p className="text-muted-foreground text-sm">
            التغطية الكاملة غير متاحة: الحد الأقصى المسموح به{" "}
            <span dir="ltr">{policy.maxPercentage}%</span>.
          </p>
        )}
      </fieldset>

      {values.coverage === "full-tuition" ? (
        <p role="note" className="text-muted-foreground text-sm">
          {scholarshipCopy.fullTuitionNotice}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor={`${idPrefix}-kind`} className="text-sm font-medium">
              {scholarshipCopy.kind}
            </label>
            <select
              id={`${idPrefix}-kind`}
              value={values.kind}
              onChange={(event) =>
                set({ kind: event.target.value as ReductionKind })
              }
              className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
            >
              <option value="percentage">{scholarshipCopy.percentage}</option>
              <option value="amount">{scholarshipCopy.amount}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor={`${idPrefix}-value`} className="text-sm font-medium">
              {scholarshipCopy.value}
              {values.kind === "percentage" && (
                <>
                  {" — "}
                  {scholarshipCopy.limitHint}{" "}
                  <span dir="ltr">{policy.maxPercentage}%</span>
                </>
              )}
            </label>
            <input
              {...field("value")}
              inputMode="decimal"
              dir="ltr"
              value={values.value}
              onChange={(event) => set({ value: event.target.value })}
              className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-start outline-none focus-visible:ring-2"
            />
            <FieldError id={`${idPrefix}-value-error`} message={errors.value} />
          </div>
        </>
      )}

      {enrollments.length > 1 && (
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-enrollmentId`}
            className="text-sm font-medium"
          >
            نطاق التطبيق
          </label>
          <select
            id={`${idPrefix}-enrollmentId`}
            value={values.enrollmentId}
            onChange={(event) => set({ enrollmentId: event.target.value })}
            className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
          >
            <option value="">{scholarshipCopy.scopeAll}</option>
            {enrollments.map((enrollment) => (
              <option key={enrollment.enrollmentId} value={enrollment.enrollmentId}>
                {enrollment.offeringLabel}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-reason`} className="text-sm font-medium">
          {scholarshipCopy.reason}
        </label>
        <textarea
          {...field("reason")}
          rows={2}
          value={values.reason}
          onChange={(event) => set({ reason: event.target.value })}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
        />
        <FieldError id={`${idPrefix}-reason-error`} message={errors.reason} />
      </div>
    </div>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  )
}
