import { Card } from "@/shared/components/layout/card"
import type { StudentFinancialProfile } from "../types/projections"
import { profileCopy } from "../config/finance-copy"
import { MoneyValue } from "./money-value"
import { FinancialStatusBadge } from "./invoice-status-badge"

/**
 * The headline figures.
 *
 * Rendered as a description list so each label-value pair is announced as a pair,
 * and each amount carries its currency rather than reading as a bare number.
 */
export function FinancialSummaryCards({
  profile,
}: {
  profile: StudentFinancialProfile
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Figure label={profileCopy.totalFees} value={profile.totals.totalFees} />
      <Figure label={profileCopy.paidAmount} value={profile.totals.paidAmount} />
      <Figure
        label={profileCopy.remainingBalance}
        value={profile.totals.remainingBalance}
      />
      <Card>
        <div className="min-w-0">
          <dt className="text-muted-foreground text-sm">
            {profileCopy.financialStatus}
          </dt>
          <dd className="mt-2 flex flex-wrap items-center gap-2">
            <FinancialStatusBadge status={profile.financialStatus} />
            <span className="text-muted-foreground text-xs">
              {profileCopy.outstandingInstallments}: {profile.outstandingInstallments}
            </span>
          </dd>
        </div>
      </Card>
    </dl>
  )
}

function Figure({
  label,
  value,
}: {
  label: string
  value: Parameters<typeof MoneyValue>[0]["value"]
}) {
  return (
    <Card>
      <div className="min-w-0">
        <dt className="text-muted-foreground text-sm">{label}</dt>
        <dd className="mt-2 text-2xl font-semibold">
          <MoneyValue value={value} />
        </dd>
      </div>
    </Card>
  )
}
