import {
  Banknote,
  CircleCheck,
  CircleX,
  Clock,
  Wallet,
} from "lucide-react"
import { StatCard } from "@/shared/components/layout/stat-card"
import { formatMoney } from "@/shared/utils/money"
import type { AccountingDashboard } from "../types/projections"
import { dashboardCopy } from "../config/accounting-copy"

/** Matches the icon-beside-figure treatment the other dashboards use. */
const statIcon = "text-muted-foreground size-6 shrink-0"

/**
 * The four workflow counts plus the month's total.
 *
 * Every figure comes from the dashboard projection, which derives it from the
 * same filtered read the queue uses — a card can never disagree with the list it
 * links to.
 */
export function DashboardSummaryCards({
  dashboard,
}: {
  dashboard: AccountingDashboard
}) {
  return (
    // Six columns, not five: the four counts are single digits while the
    // month's total is a formatted amount, so the total is given two columns
    // rather than being squeezed into a count's width and truncated.
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <StatCard
        label={dashboardCopy.pending}
        value={String(dashboard.counts.pending)}
        icon={<Clock className={statIcon} aria-hidden />}
      />
      <StatCard
        label={dashboardCopy.approved}
        value={String(dashboard.counts.approved)}
        icon={<CircleCheck className={statIcon} aria-hidden />}
      />
      <StatCard
        label={dashboardCopy.rejected}
        value={String(dashboard.counts.rejected)}
        icon={<CircleX className={statIcon} aria-hidden />}
      />
      <StatCard
        label={dashboardCopy.paid}
        value={String(dashboard.counts.paid)}
        icon={<Banknote className={statIcon} aria-hidden />}
      />
      <div className="sm:col-span-2">
        <StatCard
          label={dashboardCopy.monthlyTotal}
          value={formatMoney(dashboard.monthlyTotal)}
          icon={<Wallet className={statIcon} aria-hidden />}
        />
      </div>
    </div>
  )
}
