"use client"

import { useId } from "react"
import { FilterX } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { FilterBar } from "@/shared/components/data-table/filter-bar"
import { SearchBar } from "@/shared/components/data-table/search-bar"
import { Dropdown } from "@/shared/components/forms/dropdown"
import type { LookupOption } from "../types/common"
import { DateRangeFilter, type DateRangeValue } from "./date-range-filter"

export interface FinanceFilterOption {
  value: string
  label: string
}

export interface FinanceFilterGroup {
  id: string
  label: string
  options: readonly FinanceFilterOption[]
  /** Selected values; an empty array means "no filter", never "none match". */
  selected: readonly string[]
  onChange: (selected: string[]) => void
}

/**
 * The filter surface shared by all four finance queues.
 *
 * Built from the same `FilterBar` and `Dropdown` primitives the students and
 * admissions lists use, so a filter row reads identically across the workspace
 * — it previously hand-rolled its own `<select>` at a different height with a
 * different label weight, which made finance look like a separate product.
 *
 * Every control is driven by lookups rather than hardcoded lists, so a new
 * branch, payment method, or status reaches the toolbar as data. The clear
 * control stays visible whenever anything is applied: an empty queue must never
 * look like an empty database.
 */
export function FinanceToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  groups = [],
  dateLabel,
  dateValue,
  onDateChange,
  onClear,
  actions,
}: {
  /** Omitted when the queue's table already owns the search field. */
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  groups?: readonly FinanceFilterGroup[]
  dateLabel?: string
  dateValue?: DateRangeValue
  onDateChange?: (value: DateRangeValue) => void
  onClear: () => void
  actions?: React.ReactNode
}) {
  const baseId = useId()
  const activeCount =
    groups.reduce((total, group) => total + group.selected.length, 0) +
    (search?.trim() ? 1 : 0) +
    (dateValue?.from || dateValue?.to ? 1 : 0)

  return (
    <section className="space-y-3" aria-label="أدوات التصفية">
      {(onSearchChange || actions) && (
        <div className="flex flex-wrap items-start gap-3">
          {onSearchChange && (
            <div className="min-w-56 flex-1">
              <SearchBar
                value={search ?? ""}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            </div>
          )}
          {actions}
        </div>
      )}

      <FilterBar>
        {groups.map((group) => (
          <span key={group.id} className="flex flex-col gap-1">
            <label
              htmlFor={`${baseId}-${group.id}`}
              className="text-xs text-muted-foreground"
            >
              {group.label}
            </label>
            <Dropdown
              id={`${baseId}-${group.id}`}
              className="h-10 min-w-44"
              value={group.selected[0] ?? ""}
              options={[{ value: "", label: "الكل" }, ...group.options]}
              onChange={(event) =>
                group.onChange(event.target.value ? [event.target.value] : [])
              }
            />
          </span>
        ))}

        {dateLabel && dateValue && onDateChange && (
          <DateRangeFilter
            label={dateLabel}
            value={dateValue}
            onChange={onDateChange}
          />
        )}
      </FilterBar>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onClear}>
            <FilterX aria-hidden />
            مسح كل عوامل التصفية
          </Button>
          <span className="text-sm text-muted-foreground">
            عدد عوامل التصفية المطبقة: {activeCount}
          </span>
        </div>
      )}
    </section>
  )
}

export const toFilterOptions = (
  options: readonly LookupOption[]
): FinanceFilterOption[] =>
  options.map((option) => ({ value: option.value, label: option.label }))
