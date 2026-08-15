"use client"

import { useId, useMemo } from "react"
import type { LookupOption } from "../types/common"
import { requestCopy } from "../config/accounting-copy"
import {
  createExpenseRequestSchema,
  type CategoryShape,
  type ExpenseRequestFormValues,
  type SubCategoryShape,
} from "../schemas/expense-request-schemas"

export interface ExpenseRequestFormOptions {
  branches: LookupOption[]
  categories: (CategoryShape & { name: string })[]
  subCategories: (SubCategoryShape & { name: string })[]
  precision: number
}

export function validateExpenseRequest(
  values: ExpenseRequestFormValues,
  options: ExpenseRequestFormOptions
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const parsed = createExpenseRequestSchema({
    precision: options.precision,
    categories: options.categories,
    subCategories: options.subCategories,
  }).safeParse(values)
  if (parsed.success) return { ok: true }

  const errors: Record<string, string> = {}
  for (const issue of parsed.error.issues)
    errors[issue.path.join(".")] ??= issue.message
  return { ok: false, errors }
}

/**
 * The expense-request fields.
 *
 * Only **active** categories are offered — an archived one cannot be chosen on a
 * new request, though it stays visible on requests that already use it. Changing
 * the main category clears an inconsistent sub-category rather than leaving a
 * stale one selected, which is the edge case the spec names.
 */
export function ExpenseRequestForm({
  values,
  errors,
  options,
  disabled = false,
  firstFieldRef,
  onChange,
}: {
  values: ExpenseRequestFormValues
  errors: Record<string, string>
  options: ExpenseRequestFormOptions
  disabled?: boolean
  firstFieldRef?: React.Ref<HTMLInputElement>
  onChange: (next: ExpenseRequestFormValues) => void
}) {
  const baseId = useId()

  const selectableCategories = useMemo(
    () => options.categories.filter((category) => category.status === "active"),
    [options.categories]
  )

  const selectableSubCategories = useMemo(
    () =>
      options.subCategories.filter(
        (subCategory) =>
          subCategory.status === "active" &&
          subCategory.categoryId === values.categoryId
      ),
    [options.subCategories, values.categoryId]
  )

  const set = (patch: Partial<ExpenseRequestFormValues>) =>
    onChange({ ...values, ...patch })

  const changeCategory = (categoryId: string) => {
    // Clearing rather than keeping: a sub-category under the previous parent is
    // not merely invalid, it is meaningless under the new one.
    const stillValid = options.subCategories.some(
      (subCategory) =>
        subCategory.id === values.subCategoryId &&
        subCategory.categoryId === categoryId
    )
    onChange({
      ...values,
      categoryId,
      subCategoryId: stillValid ? values.subCategoryId : "",
    })
  }

  const field = (name: keyof ExpenseRequestFormValues) => ({
    id: `${baseId}-${name}`,
    disabled,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${baseId}-${name}-error` : undefined,
  })

  const inputClass =
    "border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2 disabled:opacity-60"

  return (
    <div className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">
          {requestCopy.section.request}
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`${baseId}-requestDate`} className="text-sm font-medium">
              {requestCopy.requestDate}
            </label>
            <input
              {...field("requestDate")}
              ref={firstFieldRef}
              type="date"
              value={values.requestDate}
              onChange={(event) => set({ requestDate: event.target.value })}
              className={inputClass}
            />
            <FieldError id={`${baseId}-requestDate-error`} message={errors.requestDate} />
          </div>

          <div className="space-y-2">
            <label htmlFor={`${baseId}-branchId`} className="text-sm font-medium">
              {requestCopy.branch}
            </label>
            <select
              {...field("branchId")}
              value={values.branchId}
              onChange={(event) => set({ branchId: event.target.value })}
              className={inputClass}
            >
              <option value="">—</option>
              {options.branches.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.label}
                </option>
              ))}
            </select>
            <FieldError id={`${baseId}-branchId-error`} message={errors.branchId} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">
          {requestCopy.section.expense}
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`${baseId}-categoryId`} className="text-sm font-medium">
              {requestCopy.category}
            </label>
            <select
              {...field("categoryId")}
              value={values.categoryId}
              onChange={(event) => changeCategory(event.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {selectableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError id={`${baseId}-categoryId-error`} message={errors.categoryId} />
          </div>

          <div className="space-y-2">
            <label htmlFor={`${baseId}-subCategoryId`} className="text-sm font-medium">
              {requestCopy.subCategory}
            </label>
            <select
              {...field("subCategoryId")}
              value={values.subCategoryId}
              onChange={(event) => set({ subCategoryId: event.target.value })}
              className={inputClass}
            >
              <option value="">—</option>
              {selectableSubCategories.map((subCategory) => (
                <option key={subCategory.id} value={subCategory.id}>
                  {subCategory.name}
                </option>
              ))}
            </select>
            <FieldError
              id={`${baseId}-subCategoryId-error`}
              message={errors.subCategoryId}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor={`${baseId}-description`} className="text-sm font-medium">
            {requestCopy.description}
          </label>
          <textarea
            {...field("description")}
            rows={3}
            value={values.description}
            onChange={(event) => set({ description: event.target.value })}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-60"
          />
          <FieldError id={`${baseId}-description-error`} message={errors.description} />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${baseId}-amount`} className="text-sm font-medium">
            {requestCopy.amount}
          </label>
          <input
            {...field("amount")}
            inputMode="decimal"
            dir="ltr"
            value={values.amount}
            onChange={(event) => set({ amount: event.target.value })}
            className={`${inputClass} text-start`}
          />
          <FieldError id={`${baseId}-amount-error`} message={errors.amount} />
        </div>
      </fieldset>
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
