import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  FinanceToolbar,
  toFilterOptions,
} from "@/features/student-finance/components/finance-toolbar"
import {
  DateRangeFilter,
  isInverted,
  toDateRange,
} from "@/features/student-finance/components/date-range-filter"
import {
  clampPage,
  hasActiveFilters,
  normalizeInvoiceListQuery,
} from "@/features/student-finance/utils/finance-list-query"

afterEach(cleanup)

const statuses = [
  { value: "draft", label: "مسودة" },
  { value: "issued", label: "صادرة" },
]

function renderToolbar(
  overrides: Partial<React.ComponentProps<typeof FinanceToolbar>> = {}
) {
  const onClear = overrides.onClear ?? vi.fn()
  render(
    <FinanceToolbar
      search=""
      onSearchChange={vi.fn()}
      groups={[
        {
          id: "status",
          label: "الحالة",
          options: statuses,
          selected: [],
          onChange: vi.fn(),
        },
      ]}
      {...overrides}
      onClear={onClear}
    />
  )
  return onClear
}

describe("filters compose", () => {
  it("renders a control per filter group with an all option", () => {
    renderToolbar()
    const control = screen.getByLabelText("الحالة")
    expect(control).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "الكل" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "مسودة" })).toBeInTheDocument()
  })

  it("reports the selection upward", async () => {
    const onChange = vi.fn()
    renderToolbar({
      groups: [
        {
          id: "status",
          label: "الحالة",
          options: statuses,
          selected: [],
          onChange,
        },
      ],
    })

    await userEvent.setup().selectOptions(screen.getByLabelText("الحالة"), "issued")
    expect(onChange).toHaveBeenCalledWith(["issued"])
  })

  it("clears a group back to no filter rather than to an empty match", async () => {
    const onChange = vi.fn()
    renderToolbar({
      groups: [
        {
          id: "status",
          label: "الحالة",
          options: statuses,
          selected: ["issued"],
          onChange,
        },
      ],
    })

    await userEvent.setup().selectOptions(screen.getByLabelText("الحالة"), "")
    expect(onChange).toHaveBeenCalledWith([])
  })

  it("counts every active filter, including search and dates", () => {
    renderToolbar({
      search: "STD-2026",
      groups: [
        {
          id: "status",
          label: "الحالة",
          options: statuses,
          selected: ["issued"],
          onChange: vi.fn(),
        },
      ],
      dateLabel: "تاريخ الإصدار",
      dateValue: { from: "2026-01-01" },
      onDateChange: vi.fn(),
    })
    expect(screen.getByText(/عدد عوامل التصفية المطبقة: 3/)).toBeInTheDocument()
  })

  it("offers no clear control when nothing is filtered", () => {
    renderToolbar()
    expect(
      screen.queryByRole("button", { name: /مسح كل عوامل التصفية/ })
    ).not.toBeInTheDocument()
  })

  it("clears everything at once", async () => {
    const onClear = renderToolbar({ search: "STD-2026" })
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /مسح كل عوامل التصفية/ }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it("builds its options from lookups rather than a hardcoded list", () => {
    expect(
      toFilterOptions([
        { value: "branch-main", label: "الفرع الرئيسي", active: true },
      ])
    ).toEqual([{ value: "branch-main", label: "الفرع الرئيسي" }])
  })
})

describe("the date range control", () => {
  const renderRange = (
    value: { from?: string; to?: string },
    onChange = vi.fn()
  ) => {
    render(
      <DateRangeFilter label="تاريخ الإصدار" value={value} onChange={onChange} />
    )
    return onChange
  }

  it("says both ends are included", () => {
    renderRange({})
    expect(screen.getByText(/يشمل اليومين/)).toBeInTheDocument()
  })

  it("reports an inverted range instead of sending it", () => {
    renderRange({ from: "2026-06-01", to: "2026-01-01" })
    expect(screen.getByRole("alert")).toHaveTextContent(/تاريخ البداية/)
    expect(screen.getByLabelText(/من$/)).toHaveAttribute("aria-invalid", "true")
  })

  it("shows no error for a valid or partial range", () => {
    renderRange({ from: "2026-01-01", to: "2026-06-01" })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    cleanup()
    renderRange({ from: "2026-06-01" })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("clears both bounds together", async () => {
    const onChange = renderRange({ from: "2026-01-01", to: "2026-06-01" })
    await userEvent.setup().click(screen.getByRole("button", { name: /مسح التاريخ/ }))
    expect(onChange).toHaveBeenCalledWith({})
  })

  it("omits an inverted or empty range from the query", () => {
    expect(toDateRange({ from: "2026-06-01", to: "2026-01-01" }, "issueDate")).toBeUndefined()
    expect(toDateRange({}, "issueDate")).toBeUndefined()
    expect(toDateRange({ from: "2026-01-01" }, "issueDate")).toEqual({
      from: "2026-01-01",
      to: undefined,
      field: "issueDate",
    })
  })

  it("treats a single-sided range as valid", () => {
    expect(isInverted({ from: "2026-06-01" })).toBe(false)
    expect(isInverted({ to: "2026-01-01" })).toBe(false)
    expect(isInverted({ from: "2026-01-01", to: "2026-01-01" })).toBe(false)
  })
})

describe("pagination never lands out of bounds", () => {
  it("clamps a page beyond the last one", () => {
    expect(clampPage(99, 20, 45)).toBe(3)
  })

  it("clamps a page below the first one", () => {
    expect(clampPage(0, 20, 45)).toBe(1)
    expect(clampPage(-5, 20, 45)).toBe(1)
  })

  it("stays on page one for an empty result", () => {
    expect(clampPage(3, 20, 0)).toBe(1)
  })

  it("normalizes a query's paging before it reaches the store", () => {
    const normalized = normalizeInvoiceListQuery({ page: -2, pageSize: 5000 })
    expect(normalized.page).toBeGreaterThanOrEqual(1)
    expect(normalized.pageSize).toBeLessThanOrEqual(200)
  })
})

describe("an empty queue distinguishes 'no matches' from 'no data'", () => {
  it("reports active filters so the empty state can say which it is", () => {
    expect(hasActiveFilters({})).toBe(false)
    expect(hasActiveFilters({ search: "abc" })).toBe(true)
    expect(
      hasActiveFilters({ statuses: ["draft"] })
    ).toBe(true)
    expect(
      hasActiveFilters({
        dateRange: { from: "2026-01-01", field: "issueDate" },
      })
    ).toBe(true)
  })

  it("does not count an empty filter array as a filter", () => {
    expect(
      hasActiveFilters({ statuses: [], branchIds: [] })
    ).toBe(false)
  })
})
