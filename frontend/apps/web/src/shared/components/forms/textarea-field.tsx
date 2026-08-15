"use client"
import { useFormContext } from "react-hook-form"
export function TextareaField({
  name,
  label,
}: {
  name: string
  label: string
}) {
  const { register, getFieldState, formState } = useFormContext()
  const error = getFieldState(name, formState).error?.message
  return (
    <div className="space-y-2">
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        {...register(name)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="min-h-24 w-full rounded-lg border border-input bg-background p-3"
      />
      {typeof error === "string" && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
