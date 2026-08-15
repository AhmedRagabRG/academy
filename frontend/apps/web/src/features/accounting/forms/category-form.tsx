"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { LookupOption } from "../types/common"
import { categoryCopy } from "../config/accounting-copy"
import {
  categorySchema,
  emptyCategoryValues,
  subCategorySchema,
  type CategoryFormValues,
  type SubCategoryFormValues,
} from "../schemas/category-schemas"

export type CategoryDialogValues = CategoryFormValues & { categoryId?: string }

/**
 * One dialog for both categories and sub-categories.
 *
 * They differ only by the parent selector, and two near-identical dialogs is the
 * duplication the shared-component principle exists to prevent. Mounted only
 * while open, so each opening starts with fresh state.
 */
export function CategoryDialog({
  title,
  initial,
  parents,
  pending,
  onSubmit,
  onClose,
}: {
  title: string
  initial?: CategoryDialogValues
  /** Present for a sub-category, absent for a category. */
  parents?: LookupOption[]
  pending: boolean
  onSubmit: (values: CategoryDialogValues) => void
  onClose: () => void
}) {
  const baseId = useId()
  const [values, setValues] = useState<CategoryDialogValues>(
    initial ?? { ...emptyCategoryValues, ...(parents ? { categoryId: "" } : {}) }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    firstFieldRef.current?.focus()
    return () => triggerRef.current?.focus()
  }, [])

  const submit = () => {
    const schema = parents ? subCategorySchema : categorySchema
    const parsed = schema.safeParse(values as SubCategoryFormValues)
    if (!parsed.success) {
      const collected: Record<string, string> = {}
      for (const issue of parsed.error.issues)
        collected[issue.path.join(".")] ??= issue.message
      setErrors(collected)
      // Move focus to the first invalid field rather than leaving the user hunting.
      const first = parsed.error.issues[0]?.path.join(".")
      if (first) document.getElementById(`${baseId}-${first}`)?.focus()
      return
    }
    setErrors({})
    onSubmit(values)
  }

  const inputClass =
    "border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${baseId}-title`}
    >
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="إغلاق" />
      <div className="bg-card relative w-full max-w-lg space-y-4 rounded-xl border p-6 shadow-xl">
        <h2 id={`${baseId}-title`} className="text-lg font-semibold">
          {title}
        </h2>

        {parents && (
          <div className="space-y-2">
            <label htmlFor={`${baseId}-categoryId`} className="text-sm font-medium">
              {categoryCopy.parent}
            </label>
            <select
              id={`${baseId}-categoryId`}
              value={values.categoryId ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, categoryId: event.target.value }))
              }
              aria-invalid={Boolean(errors.categoryId)}
              aria-describedby={
                errors.categoryId ? `${baseId}-categoryId-error` : undefined
              }
              className={inputClass}
            >
              <option value="">—</option>
              {parents.map((parent) => (
                <option key={parent.value} value={parent.value}>
                  {parent.label}
                </option>
              ))}
            </select>
            <FieldError id={`${baseId}-categoryId-error`} message={errors.categoryId} />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor={`${baseId}-name`} className="text-sm font-medium">
            {categoryCopy.name}
          </label>
          <input
            id={`${baseId}-name`}
            ref={firstFieldRef}
            value={values.name}
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${baseId}-name-error` : undefined}
            className={inputClass}
          />
          <FieldError id={`${baseId}-name-error`} message={errors.name} />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${baseId}-description`} className="text-sm font-medium">
            {categoryCopy.description}
          </label>
          <textarea
            id={`${baseId}-description`}
            rows={3}
            value={values.description}
            onChange={(event) =>
              setValues((current) => ({ ...current, description: event.target.value }))
            }
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? `${baseId}-description-error` : undefined
            }
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
          />
          <FieldError
            id={`${baseId}-description-error`}
            message={errors.description}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
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
