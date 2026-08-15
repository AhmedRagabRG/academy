"use client"

import { useId } from "react"
import { Button } from "@workspace/ui/components/button"
import { SearchBar } from "@/shared/components/data-table/search-bar"
import { isInvertedRange } from "@/shared/utils/list-query"
import type { ExpenseCategoryId, ExpenseStatus, LookupOption } from "../types/common"
import type { ExpenseRequestListQuery } from "../types/commands"
import {
  accountingCopy,
  expenseStatusCopy,
  filterCopy,
  requestCopy,
} from "../config/accounting-copy"
import { countActiveRequestFilters } from "../utils/accounting-list-query"

const allStatuses = Object.keys(expenseStatusCopy) as ExpenseStatus[]

/**
 * Filters for the requests queue.
 *
 * Every option comes from lookups rather than a hardcoded list, so a new branch
 * or category reaches the toolbar as data. An inverted range is reported here and
 * **omitted from the query**, rather than sent to a service that would refuse it —
 * the user should see the problem, not an error toast.
 */
export function RequestFilterToolbar({
  query,
  branches,
  categories,
  requesters,
  onChange,
  onClear,
}: {
  query: ExpenseRequestListQuery
  branches: LookupOption[]
  categories: LookupOption[]
  requesters: LookupOption[]
  onChange: (next: ExpenseRequestListQuery) => void
  onClear: () => void
}) {
  const baseId = useId()
  const activeCount = countActiveRequestFilters(query)
  const inverted = isInvertedRange(query.dateRange)

  const set = (patch: Partial<ExpenseRequestListQuery>) =>
    onChange({ ...query, ...patch, page: 1 })

  const setRange = (patch: { from?: string; to?: string }) => {
    const next = {
      field: "requestDate" as const,
      ...query.dateRange,
      ...patch,
    }
    // An inverted range is reported below; it never becomes a query.
    onChange({
      ...query,
      dateRange: isInvertedRange(next) ? undefined : next,
      page: 1,
    })
  }

  const selectClass =
    "border-input bg-background focus-visible:ring-ring h-10 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"

  return (
    <div className="space-y-3">
      <SearchBar
        value={query.search ?? ""}
        onChange={(search) => set({ search })}
        placeholder={filterCopy.search}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field id={`${baseId}-status`} label={requestCopy.status}>
          <select
            id={`${baseId}-status`}
            value={query.statuses?.[0] ?? ""}
            onChange={(event) =>
              // Clearing returns to *no filter*, not to "match nothing".
              set({
                statuses: event.target.value
                  ? [event.target.value as ExpenseStatus]
                  : undefined,
              })
            }
            className={selectClass}
          >
            <option value="">الكل</option>
            {allStatuses.map((status) => (
              <option key={status} value={status}>
                {expenseStatusCopy[status]}
              </option>
            ))}
          </select>
        </Field>

        <Field id={`${baseId}-branch`} label={requestCopy.branch}>
          <select
            id={`${baseId}-branch`}
            value={query.branchIds?.[0] ?? ""}
            onChange={(event) =>
              set({ branchIds: event.target.value ? [event.target.value] : undefined })
            }
            className={selectClass}
          >
            <option value="">الكل</option>
            {branches.map((branch) => (
              <option key={branch.value} value={branch.value}>
                {branch.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id={`${baseId}-category`} label={requestCopy.category}>
          <select
            id={`${baseId}-category`}
            value={query.categoryIds?.[0] ?? ""}
            onChange={(event) =>
              set({
                categoryIds: event.target.value
                  ? [event.target.value as ExpenseCategoryId]
                  : undefined,
              })
            }
            className={selectClass}
          >
            <option value="">الكل</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id={`${baseId}-requester`} label={requestCopy.requestedBy}>
          <select
            id={`${baseId}-requester`}
            value={query.requesterIds?.[0] ?? ""}
            onChange={(event) =>
              set({
                requesterIds: event.target.value ? [event.target.value] : undefined,
              })
            }
            className={selectClass}
          >
            <option value="">الكل</option>
            {requesters.map((requester) => (
              <option key={requester.value} value={requester.value}>
                {requester.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id={`${baseId}-from`} label={filterCopy.dateFrom}>
          <input
            id={`${baseId}-from`}
            type="date"
            value={query.dateRange?.from ?? ""}
            onChange={(event) => setRange({ from: event.target.value || undefined })}
            aria-invalid={inverted}
            aria-describedby={inverted ? `${baseId}-range-error` : undefined}
            className={selectClass}
          />
        </Field>

        <Field id={`${baseId}-to`} label={filterCopy.dateTo}>
          <input
            id={`${baseId}-to`}
            type="date"
            value={query.dateRange?.to ?? ""}
            onChange={(event) => setRange({ to: event.target.value || undefined })}
            aria-invalid={inverted}
            aria-describedby={inverted ? `${baseId}-range-error` : undefined}
            className={selectClass}
          />
        </Field>

        {activeCount > 0 && (
          <Button variant="outline" onClick={onClear}>
            {accountingCopy.clearFilters}
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">{filterCopy.rangeInclusive}</p>

      {inverted && (
        <p id={`${baseId}-range-error`} role="alert" className="text-destructive text-sm">
          {filterCopy.invertedRange}
        </p>
      )}

      {activeCount > 0 && (
        <p className="text-muted-foreground text-sm">
          {filterCopy.activeCount}: <bdi dir="ltr">{activeCount}</bdi>
        </p>
      )}
    </div>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}
