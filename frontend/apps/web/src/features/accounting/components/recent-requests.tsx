import Link from "next/link"
import { Card } from "@/shared/components/layout/card"
import { EmptyState } from "@/shared/components/states/empty-state"
import { formatMoney } from "@/shared/utils/money"
import type { ExpenseRequestSummary } from "../types/projections"
import { dashboardCopy, requestCopy } from "../config/accounting-copy"
import { AccountingBidiValue } from "./accounting-area-states"
import { ExpenseStatusBadge } from "./expense-status-badge"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })
const formatDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

export function RecentRequests({
  requests,
}: {
  requests: readonly ExpenseRequestSummary[]
}) {
  if (requests.length === 0)
    return <EmptyState title={requestCopy.emptyAllTitle} />

  return (
    <Card className="space-y-3">
      <h3 className="font-medium">{dashboardCopy.recent}</h3>
      <ul className="space-y-3">
        {requests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/accounting/expense-requests/${request.id}`}
                className="focus-visible:ring-ring rounded font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
              >
                <AccountingBidiValue>{request.requestNumber}</AccountingBidiValue>
              </Link>
              <p className="text-muted-foreground text-sm">
                {request.branchLabel} · {request.categoryLabel} ·{" "}
                <AccountingBidiValue>
                  {formatDate(request.requestDate)}
                </AccountingBidiValue>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AccountingBidiValue className="font-medium">
                {formatMoney(request.amount)}
              </AccountingBidiValue>
              <ExpenseStatusBadge status={request.status} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
