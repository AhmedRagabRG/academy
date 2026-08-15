"use client"
import { useFormContext } from "react-hook-form"
import { Dropdown, type DropdownOption } from "./dropdown"
export function SelectField({
  name,
  label,
  options,
  placeholder,
  hint,
}: {
  name: string
  label: string
  options: readonly DropdownOption[]
  placeholder?: string
  /** Why the choices are what they are — shown unless an error replaces it. */
  hint?: string
}) {
  const { register, getFieldState, formState } = useFormContext()
  const error = getFieldState(name, formState).error?.message
  const errorId = `${name}-error`
  const hintId = `${name}-hint`
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Dropdown
        id={name}
        options={options}
        placeholder={placeholder}
        error={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...register(name)}
      />
      {typeof error === "string" ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-muted-foreground text-xs">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
