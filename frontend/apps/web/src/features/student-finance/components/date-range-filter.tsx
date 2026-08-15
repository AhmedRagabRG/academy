"use client"

import { useId } from "react"
import type { DateRange } from "../types/common"

export interface DateRangeValue {
  from?: string
  to?: string
}

/**
 * An inclusive date-range control.
 *
 * Both bounds name **days**, and both are included — the label says so, because a
 * user who assumes an exclusive upper bound will widen the range by a day and
 * quietly double-count. An inverted range is reported here rather than being sent
 * to a service that would refuse it.
 */
export function DateRangeFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: DateRangeValue
  onChange: (next: DateRangeValue) => void
}) {
  const baseId = useId()
  const inverted = isInverted(value)

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs text-muted-foreground">
        {label}{" "}
        <span className="font-normal text-muted-foreground">
          (يشمل اليومين)
        </span>
      </legend>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`${baseId}-from`}>
          {label} — من
        </label>
        <input
          id={`${baseId}-from`}
          type="date"
          value={value.from ?? ""}
          aria-invalid={inverted}
          aria-describedby={inverted ? `${baseId}-error` : undefined}
          onChange={(event) =>
            onChange({ ...value, from: event.target.value || undefined })
          }
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-sm text-muted-foreground">—</span>
        <label className="sr-only" htmlFor={`${baseId}-to`}>
          {label} — إلى
        </label>
        <input
          id={`${baseId}-to`}
          type="date"
          value={value.to ?? ""}
          aria-invalid={inverted}
          aria-describedby={inverted ? `${baseId}-error` : undefined}
          onChange={(event) =>
            onChange({ ...value, to: event.target.value || undefined })
          }
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {(value.from || value.to) && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="rounded text-sm text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            مسح التاريخ
          </button>
        )}
      </div>
      {inverted && (
        <p
          id={`${baseId}-error`}
          role="alert"
          className="text-sm text-destructive"
        >
          تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.
        </p>
      )}
    </fieldset>
  )
}

export function isInverted(value: DateRangeValue): boolean {
  if (!value.from || !value.to) return false
  return value.from > value.to
}

/** The query fragment for a range, or nothing when it is empty or inverted. */
export function toDateRange<TField extends string>(
  value: DateRangeValue,
  field: TField
): (DateRange & { field: TField }) | undefined {
  if (isInverted(value)) return undefined
  if (!value.from && !value.to) return undefined
  return { from: value.from, to: value.to, field }
}
