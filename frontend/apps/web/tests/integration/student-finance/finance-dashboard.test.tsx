import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FinanceDashboardScreen } from "@/features/student-finance/screens/finance-dashboard-screen"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { allFinancePermissions } from "@/features/student-finance/config/finance-permissions"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import { formatMoney } from "@/shared/utils/money"

/**
 * The dashboard reads a dedicated summary. These assert what reaches the screen,
 * because the previous version derived its figures from a capped invoice page and
 * still rendered a confident, wrong total.
 */
function renderDashboard() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <FinanceDashboardScreen />
    </QueryClientProvider>
  )
}

describe("the finance dashboard", () => {
  beforeEach(() => {
    resetFinanceStore()
    // A full context: the scope fingerprint stamped into every query key reads
    // the employee and branch scope, not only the permission list.
    useEmployeeContextStore.setState({
      context: {
        employee: {
          id: "employee-demo",
          displayName: "أحمد محمد",
          email: "employee@alsalam.edu",
          roleIds: ["role-internal"],
          branchIds: ["branch-main"],
        },
        role: {
          id: "role-internal",
          code: "internal-employee",
          displayName: "موظف داخلي",
          permissionKeys: allFinancePermissions,
          status: "active",
        },
        branch: {
          id: "branch-main",
          code: "main",
          displayName: "الفرع الرئيسي",
          status: "active",
        },
        organizationId: "organization-alsalam",
        organizationWide: true,
        authenticatedAt: "2026-08-01T10:00:00.000Z",
      },
    } as never)
  })

  afterEach(() => {
    cleanup()
    financeScenarios.reset()
    useEmployeeContextStore.setState({ context: null } as never)
  })

  it("renders the four collection figures", async () => {
    renderDashboard()

    expect(await screen.findByText("إجمالي المفوتر")).toBeInTheDocument()
    expect(screen.getByText("إجمالي المحصّل")).toBeInTheDocument()
    expect(screen.getByText("إجمالي المتبقي")).toBeInTheDocument()
    expect(screen.getByText("فواتير غير مسددة بالكامل")).toBeInTheDocument()
  })

  it("shows the totals the service reports, not a page of them", async () => {
    // Comfortably past the 100-row page cap the old screen summed.
    financeScenarios.useScale(true, 400)
    const summary = await studentFinanceService.getDashboardSummary({})

    renderDashboard()

    // Formatted money carries bidi isolation marks, so compare on stripped text.
    const strip = (value: string) => value.replace(/[‎‏]/g, "").trim()
    const expected = strip(formatMoney(summary.invoiced))

    await waitFor(() => {
      const shown = screen
        .getAllByRole("definition")
        .map((node) => strip(node.textContent ?? ""))
      expect(shown).toContain(expected)
      expect(shown).toContain(String(summary.unsettledInvoices))
    })
  })

  it("says nothing is recorded rather than showing zeroes", async () => {
    financeScenarios.setContext({
      organizationWide: false,
      authorizedBranchIds: ["branch-with-no-invoices"],
    })

    renderDashboard()

    expect(await screen.findByText("لا توجد فواتير بعد")).toBeInTheDocument()
    expect(screen.queryByText("إجمالي المفوتر")).not.toBeInTheDocument()
  })

  it("offers a retry when the summary fails", async () => {
    financeScenarios.failNext("invoices")

    renderDashboard()

    expect(
      await screen.findByRole("button", { name: /إعادة المحاولة|حاول/ })
    ).toBeInTheDocument()
  })
})
