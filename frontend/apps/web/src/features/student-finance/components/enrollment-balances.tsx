import { Card } from "@/shared/components/layout/card"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { EnrollmentBalance } from "../types/projections"
import { invoiceCopy, profileCopy } from "../config/finance-copy"
import { MoneyValue } from "./money-value"
import { FinancialStatusBadge } from "./invoice-status-badge"

const offeringKindCopy = {
  "professional-program": "برنامج احترافي",
  "professional-diploma": "دبلومة احترافية",
  "training-course": "دورة تدريبية",
} as const

/**
 * A student may carry several concurrent enrollments and therefore several
 * concurrent balances. These roll up exactly to the student totals — asserted by
 * `student-financial-profile.test.ts`.
 */
export function EnrollmentBalances({
  balances,
}: {
  balances: readonly EnrollmentBalance[]
}) {
  if (balances.length === 0)
    return (
      <EmptyState
        title={profileCopy.emptyTitle}
        description={profileCopy.emptyDescription}
      />
    )

  return (
    <ul className="space-y-3">
      {balances.map((balance) => (
        <li key={balance.enrollmentId}>
          <Card className="flex flex-wrap items-start justify-between gap-4 p-4">
            <div className="min-w-0 space-y-1">
              <p className="font-medium">{balance.offeringLabel}</p>
              <p className="text-muted-foreground text-sm">
                {offeringKindCopy[balance.offeringKind]}
                {balance.batchLabel && ` · ${balance.batchLabel}`}
              </p>
              <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <Pair label={invoiceCopy.finalAmount} value={balance.totalFees} />
                <Pair label={invoiceCopy.paidAmount} value={balance.paidAmount} />
                <Pair label={invoiceCopy.remaining} value={balance.remaining} />
              </dl>
            </div>
            <FinancialStatusBadge status={balance.status} />
          </Card>
        </li>
      ))}
    </ul>
  )
}

function Pair({
  label,
  value,
}: {
  label: string
  value: Parameters<typeof MoneyValue>[0]["value"]
}) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="font-medium">
        <MoneyValue value={value} />
      </dd>
    </div>
  )
}
