"use client"

import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { Card } from "@/shared/components/layout/card"
import { Section } from "@/shared/components/layout/section"
import { accountingCopy, dashboardCopy } from "../config/accounting-copy"
import { accountingPermissions } from "../config/accounting-permissions"
import { useAccountingDashboard } from "../hooks/use-dashboard"
import {
  AccountingAreaState,
  AccountingBidiValue,
} from "../components/accounting-area-states"
import { DashboardSummaryCards } from "../components/dashboard-summary-cards"
import { ExpenseBreakdown } from "../components/expense-breakdowns"
import { RecentRequests } from "../components/recent-requests"
import { DashboardQuickActions } from "../components/dashboard-quick-actions"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })

export function AccountingDashboardScreen() {
  const dashboard = useAccountingDashboard()

  return (
    <PageContainer>
      <PageHeader
        title={dashboardCopy.title}
        description={accountingCopy.description}
      />

      <AccountingAreaState
        permission={accountingPermissions.dashboardView}
        loading={dashboard.isLoading}
        error={dashboard.error}
        onRetry={() => void dashboard.refetch()}
        loadingLabel="جارٍ تحميل لوحة المحاسبة"
      >
        {dashboard.data && (
          <div className="space-y-8">
            {/* Zeroes are only shown when they are figures, never when they mean
                "nothing has been recorded yet". */}
            {dashboard.data.hasNoRecords ? (
              <Card className="space-y-2">
                <p className="font-medium">{dashboardCopy.emptyTitle}</p>
                <p className="text-muted-foreground text-sm">
                  {dashboardCopy.emptyDescription}
                </p>
              </Card>
            ) : (
              <>
                <DashboardSummaryCards dashboard={dashboard.data} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <ExpenseBreakdown
                    title={dashboardCopy.byBranch}
                    rows={dashboard.data.byBranch}
                    emptyTitle={dashboardCopy.emptyTitle}
                  />
                  <ExpenseBreakdown
                    title={dashboardCopy.byCategory}
                    rows={dashboard.data.byCategory}
                    emptyTitle={dashboardCopy.emptyTitle}
                  />
                </div>

                <Section title={dashboardCopy.recent}>
                  <RecentRequests requests={dashboard.data.recent} />
                </Section>
              </>
            )}

            <DashboardQuickActions permissions={dashboard.data.permissions} />

            <p className="text-muted-foreground text-xs">
              {dashboardCopy.asOf}:{" "}
              <AccountingBidiValue>
                {dateFormatter.format(new Date(dashboard.data.asOf))}
              </AccountingBidiValue>
            </p>
          </div>
        )}
      </AccountingAreaState>
    </PageContainer>
  )
}
