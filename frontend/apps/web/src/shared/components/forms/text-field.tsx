"use client"
import { useFormContext } from "react-hook-form"
export function TextField({
  name,
  label,
  type = "text",
  dir,
  disabled,
  inputMode,
  min,
  max,
}: {
  name: string
  label: string
  type?: string
  dir?: "ltr" | "rtl"
  disabled?: boolean
  /**
   * Surfaces a numeric keypad without making this a `type="number"` input.
   * Monetary fields need it: a number input is registered `valueAsNumber` below,
   * and a money amount must stay a decimal string.
   */
  inputMode?: "text" | "decimal" | "numeric"
  min?: number
  max?: number
}) {
  const { register, getFieldState, formState } = useFormContext()
  const error = getFieldState(name, formState).error?.message
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        type={type}
        dir={dir}
        disabled={disabled}
        inputMode={inputMode}
        min={min}
        max={max}
        {...register(name, { valueAsNumber: type === "number" })}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring"
      />
      {typeof error === "string" && (
        <p
          id={`${name}-error`}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}
