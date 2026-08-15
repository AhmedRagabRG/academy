import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RequestFilterToolbar } from "@/features/accounting/components/request-filter-toolbar"
import { AccountingEmptyState } from "@/features/accounting/components/accounting-area-states"
import { requestColumns } from "@/features/accounting/components/request-columns"
import { defaultRequestListQuery } from "@/features/accounting/utils/accounting-list-query"
import type { ExpenseRequestListQuery } from "@/features/accounting/types/commands"

afterEach(cleanup)

const branches = [
  { value: "branch-cairo", label: "فرع القاهرة" },
  { value: "branch-giza", label: "فرع الجيزة" },
]
const categories = [{ value: "category-marketing", label: "التسويق" }]
const requesters = [{ value: "user-branch", label: "مدير فرع" }]

function renderToolbar(query: ExpenseRequestListQuery = defaultRequestListQuery) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <RequestFilterToolbar
      query={query}
      branches={branches}
      categories={categories}
      requesters={requesters}
      onChange={onChange}
      onClear={onClear}
    />
  )
  return { onChange, onClear }
}

describe("filter options come from lookups, never a hardcoded list", () => {
  it("offers every supplied branch", () => {
    renderToolbar()
    expect(screen.getByRole("option", { name: "فرع القاهرة" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "فرع الجيزة" })).toBeInTheDocument()
  })

  it("offers every supplied category and requester", () => {
    renderToolbar()
    expect(screen.getByRole("option", { name: "التسويق" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "مدير فرع" })).toBeInTheDocument()
  })

  it("offers all eight statuses", () => {
    renderToolbar()
    for (const label of [
      "مسودة",
      "مُقدَّم",
      "قيد المراجعة",
      "مُعاد للتعديل",
      "معتمد",
      "مرفوض",
      "مدفوع",
      "ملغى",
    ])
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument()
  })
})

describe("clearing a filter returns to no filter", () => {
  it("sets the status filter to undefined, not to an empty match", async () => {
    const user = userEvent.setup()
    const { onChange } = renderToolbar({
      ...defaultRequestListQuery,
      statuses: ["draft"],
    })

    await user.selectOptions(screen.getByLabelText(/^الحالة$/), "")
    // An empty array would mean "match nothing"; undefined means "no filter".
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: undefined })
    )
  })

  it("resets the page when a filter changes", async () => {
    const user = userEvent.setup()
    const { onChange } = renderToolbar({ ...defaultRequestListQuery, page: 5 })
    await user.selectOptions(screen.getByLabelText(/^الحالة$/), "draft")
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
  })
})

describe("the active-filter count and clear control", () => {
  it("shows neither when nothing is filtered", () => {
    renderToolbar()
    expect(screen.queryByText(/عدد عوامل التصفية/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /مسح كل عوامل التصفية/ })
    ).not.toBeInTheDocument()
  })

  it("counts the filters in force", () => {
    renderToolbar({
      ...defaultRequestListQuery,
      search: "x",
      statuses: ["draft"],
      branchIds: ["branch-cairo"],
    })
    expect(screen.getByText(/عدد عوامل التصفية/)).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("offers one control that clears everything", async () => {
    const user = userEvent.setup()
    const { onClear } = renderToolbar({
      ...defaultRequestListQuery,
      statuses: ["draft"],
    })
    await user.click(screen.getByRole("button", { name: /مسح كل عوامل التصفية/ }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})

describe("the date range", () => {
  it("states that both ends are included", () => {
    // A user assuming an exclusive upper bound widens the range by a day and
    // double-counts.
    renderToolbar()
    expect(screen.getByText(/يشمل تاريخي البداية والنهاية/)).toBeInTheDocument()
  })

  it("reports an inverted range and marks both inputs invalid", () => {
    renderToolbar({
      ...defaultRequestListQuery,
      dateRange: { field: "requestDate", from: "2026-08-01", to: "2026-01-01" },
    })
    expect(screen.getByRole("alert")).toHaveTextContent(/تاريخ البداية/)
    expect(screen.getByLabelText(/من/)).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText(/إلى/)).toHaveAttribute("aria-invalid", "true")
  })

  it("omits an inverted range from the query rather than sending it", async () => {
    const user = userEvent.setup()
    const { onChange } = renderToolbar({
      ...defaultRequestListQuery,
      dateRange: { field: "requestDate", to: "2026-01-01" },
    })

    await user.type(screen.getByLabelText(/من/), "2026-08-01")
    // The service would refuse it; the user should see the problem, not a toast.
    const lastCall = onChange.mock.calls.at(-1)![0] as ExpenseRequestListQuery
    expect(lastCall.dateRange).toBeUndefined()
  })

  it("keeps a valid range", async () => {
    const user = userEvent.setup()
    const { onChange } = renderToolbar()
    await user.type(screen.getByLabelText(/من/), "2026-01-01")
    const lastCall = onChange.mock.calls.at(-1)![0] as ExpenseRequestListQuery
    expect(lastCall.dateRange?.from).toBeTruthy()
  })
})

describe("empty states distinguish filtered from empty", () => {
  it("says no request exists when nothing is filtered", () => {
    render(
      <AccountingEmptyState
        filtered={false}
        emptyTitle="لا توجد طلبات مصروفات بعد"
        emptyDescription="ستظهر هنا فور إنشائها"
        filteredTitle="لا توجد طلبات مطابقة"
      />
    )
    expect(screen.getByText("لا توجد طلبات مصروفات بعد")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /مسح كل عوامل التصفية/ })
    ).not.toBeInTheDocument()
  })

  it("says nothing matched and offers to clear when filters are active", async () => {
    const user = userEvent.setup()
    const onClearFilters = vi.fn()
    render(
      <AccountingEmptyState
        filtered
        emptyTitle="لا توجد طلبات مصروفات بعد"
        filteredTitle="لا توجد طلبات مطابقة"
        onClearFilters={onClearFilters}
      />
    )
    expect(screen.getByText("لا توجد طلبات مطابقة")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /مسح كل عوامل التصفية/ }))
    expect(onClearFilters).toHaveBeenCalledTimes(1)
  })
})

describe("the queue's columns", () => {
  it("covers number, date, branch, requester, category, amount, attachments, and status", () => {
    const ids = requestColumns.map((column) => column.id)
    for (const id of [
      "رقم الطلب",
      "تاريخ الطلب",
      "الفرع",
      "مقدّم الطلب",
      "التصنيف الرئيسي",
      "المبلغ المطلوب",
      "المرفقات",
      "الحالة",
    ])
      expect(ids, id).toContain(id)
  })
})
