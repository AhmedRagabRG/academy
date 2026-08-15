"use client"

import { useFormContext } from "react-hook-form"

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g

/** Folds Arabic-Indic digits so a value typed on an Arabic keypad parses. */
function foldDigits(value: string): string {
  return value.replace(ARABIC_INDIC_DIGITS, (digit) => {
    const code = digit.charCodeAt(0)
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660
    return String(code - base)
  })
}

/**
 * Currency-aware monetary input.
 *
 * Reports a **decimal string**, never a JavaScript number — parsing to a float at
 * the UI boundary would reintroduce exactly the drift the shared money module
 * exists to prevent. The value renders left-to-right inside RTL layout, and the
 * currency is announced rather than shown as decoration alone.
 */
export function CurrencyField({
  name,
  label,
  currency,
  precision = 2,
  hint,
  disabled,
}: {
  name: string
  label: string
  currency: string
  precision?: number
  hint?: string
  disabled?: boolean
}) {
  const { register, setValue, getFieldState, formState } = useFormContext()
  const error = getFieldState(name, formState).error?.message
  const errorId = `${name}-error`
  const hintId = `${name}-hint`

  const registration = register(name)

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={name}
          inputMode="decimal"
          dir="ltr"
          disabled={disabled}
          {...registration}
          onChange={(event) => {
            const folded = foldDigits(event.target.value)
            if (folded !== event.target.value)
              setValue(name, folded, { shouldValidate: false })
            void registration.onChange(event)
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [error ? errorId : undefined, hint ? hintId : undefined]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-start outline-none focus-visible:ring-2 disabled:opacity-50"
        />
        <span className="text-muted-foreground shrink-0 text-sm">
          {currency}
          <span className="sr-only"> بدقة {precision} منزلة عشرية</span>
        </span>
      </div>
      {hint && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {typeof error === "string" && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
