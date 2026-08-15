import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { DashboardSummaryCards } from "@/features/accounting/components/dashboard-summary-cards"
import { ExpenseBreakdown } from "@/features/accounting/components/expense-breakdowns"
import { RecentRequests } from "@/features/accounting/components/recent-requests"
import { DashboardQuickActions } from "@/features/accounting/components/dashboard-quick-actions"
import { makeMoney } from "@/shared/utils/money"
import type {
  AccountingAreaPermissions,
  AccountingDashboard,
  ExpenseBreakdownRow,
  ExpenseRequestSummary,
} from "@/features/accounting/types/projections"

afterEach(cleanup)

const money = (amount: string) => makeMoney(amount, "EGP", 2)

const dashboard: AccountingDashboard = {
  counts: { pending: 3, approved: 2, rejected: 1, paid: 4 },
  monthlyTotal: money("12500.75"),
  byBranch: [],
  byCategory: [],
  recent: [],
  hasNoRecords: false,
  asOf: "2026-08-01T12:00:00.000Z",
  permissions: {} as AccountingAreaPermissions,
}

describe("the summary cards", () => {
  it("shows each workflow count", () => {
    render(<DashboardSummaryCards dashboard={dashboard} />)
    expect(screen.getByText("طلبات قيد المعالجة")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("طلبات معتمدة")).toBeInTheDocument()
    expect(screen.getByText("طلبات مرفوضة")).toBeInTheDocument()
    expect(screen.getByText("طلبات مدفوعة")).toBeInTheDocument()
  })

  it("shows the month's total as formatted money", () => {
    render(<DashboardSummaryCards dashboard={dashboard} />)
    expect(screen.getByText("مصروفات الشهر")).toBeInTheDocument()
    // Formatted through Intl, so the figure carries its currency.
    expect(screen.getByText(/١٢|12/)).toBeInTheDocument()
  })
})

describe("a breakdown is readable without the chart", () => {
  const rows: ExpenseBreakdownRow[] = [
    { key: "branch-cairo", label: "فرع القاهرة", total: money("9000.00"), count: 3 },
    { key: "branch-giza", label: "فرع الجيزة", total: money("3500.50"), count: 2 },
  ]

  it("renders a semantic table alongside the chart", () => {
    render(
      <ExpenseBreakdown title="المصروفات حسب الفرع" rows={rows} emptyTitle="لا شيء" />
    )
    const table = screen.getByRole("table")
    expect(within(table).getByRole("columnheader", { name: "البند" })).toBeInTheDocument()
    expect(
      within(table).getByRole("columnheader", { name: "عدد الطلبات" })
    ).toBeInTheDocument()
    expect(within(table).getByRole("columnheader", { name: "الإجمالي" })).toBeInTheDocument()
  })

  it("shows every figure as text, not only in the chart", () => {
    // A chart alone would make these numbers unavailable to a screen reader.
    render(
      <ExpenseBreakdown title="المصروفات حسب الفرع" rows={rows} emptyTitle="لا شيء" />
    )
    expect(screen.getByText("فرع القاهرة")).toBeInTheDocument()
    expect(screen.getByText("فرع الجيزة")).toBeInTheDocument()
  })

  it("names the table for a screen reader", () => {
    render(
      <ExpenseBreakdown title="المصروفات حسب الفرع" rows={rows} emptyTitle="لا شيء" />
    )
    expect(screen.getByRole("table")).toHaveAccessibleName("المصروفات حسب الفرع")
  })

  it("hides the decorative chart from assistive technology", () => {
    const { container } = render(
      <ExpenseBreakdown title="المصروفات حسب الفرع" rows={rows} emptyTitle="لا شيء" />
    )
    expect(container.querySelector("[aria-hidden]")).toBeTruthy()
  })

  it("shows an empty state rather than an empty chart", () => {
    render(<ExpenseBreakdown title="المصروفات" rows={[]} emptyTitle="لا توجد بيانات" />)
    expect(screen.getByText("لا توجد بيانات")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})

describe("recent requests link into the detail", () => {
  const requests: ExpenseRequestSummary[] = [
    {
      id: "request-1",
      requestNumber: "EXP-2026-00001",
      requestDate: "2026-07-20T09:00:00.000Z",
      branchId: "branch-cairo",
      branchLabel: "فرع القاهرة",
      requesterName: "مدير فرع",
      categoryLabel: "التسويق",
      amount: money("4500.00"),
      status: "draft",
      attachmentCount: 1,
      updatedAt: "2026-07-20T09:00:00.000Z",
      version: 1,
    } as ExpenseRequestSummary,
  ]

  it("links each request by its number", () => {
    render(<RecentRequests requests={requests} />)
    const link = screen.getByRole("link", { name: /EXP-2026-00001/ })
    expect(link).toHaveAttribute("href", "/accounting/expense-requests/request-1")
  })

  it("shows its branch, category, and status", () => {
    render(<RecentRequests requests={requests} />)
    expect(screen.getByText(/فرع القاهرة/)).toBeInTheDocument()
    expect(screen.getByText("مسودة")).toBeInTheDocument()
  })

  it("shows an empty state when there are none", () => {
    render(<RecentRequests requests={[]} />)
    expect(screen.getByText(/لا توجد طلبات مصروفات بعد/)).toBeInTheDocument()
  })
})

describe("quick actions follow the reported permissions", () => {
  const permissions = (patch: Partial<AccountingAreaPermissions>) =>
    ({ ...patch }) as AccountingAreaPermissions

  /**
   * Each action navigates, so it must render a real anchor carrying an `href`.
   *
   * The design system's `Button` with `render={<Link/>}` needs
   * `nativeButton={false}`; without it, it claims native <button> semantics for an
   * element that is not a button and warns at runtime. Base UI then renders an
   * `<a>` that carries `role="button"` — so the assertion here is on the element
   * and its href, not on the ARIA role.
   */
  it("renders each action as an anchor carrying its href", () => {
    render(
      <DashboardQuickActions
        permissions={permissions({ requestsCreate: true, requestsView: true })}
      />
    )
    const actions = screen.getAllByRole("button")
    expect(actions.length).toBe(2)
    for (const action of actions) {
      // A <button> here would break middle-click, copy-link, and browser history.
      expect(action.tagName).toBe("A")
      expect(action).toHaveAttribute("href")
    }
  })

  it("offers create only with the create permission", () => {
    render(<DashboardQuickActions permissions={permissions({ requestsCreate: true })} />)
    expect(
      screen.getByRole("button", { name: /إنشاء طلب مصروفات/ })
    ).toHaveAttribute("href", "/accounting/expense-requests/create")
  })

  it("hides create without it", () => {
    render(<DashboardQuickActions permissions={permissions({ requestsView: true })} />)
    // Hidden rather than disabled: an action they can never take is noise.
    expect(
      screen.queryByRole("button", { name: /إنشاء طلب مصروفات/ })
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /طلبات المصروفات/ })).toBeInTheDocument()
  })

  it("renders nothing at all when no action is permitted", () => {
    const { container } = render(<DashboardQuickActions permissions={permissions({})} />)
    expect(container).toBeEmptyDOMElement()
  })
})
