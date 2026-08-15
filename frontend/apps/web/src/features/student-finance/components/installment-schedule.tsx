import { EmptyState } from "@/shared/components/states/empty-state"
import { sum } from "@/shared/utils/money"
import type { InstallmentView } from "../types/projections"
import { installmentCopy } from "../config/finance-copy"
import { FinanceBidiValue } from "./finance-area-states"
import { MoneyValue } from "./money-value"
import { InstallmentStatusBadge } from "./invoice-status-badge"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })
const formatDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

/**
 * The schedule as a semantic table, so a screen reader announces each amount with
 * its column. The footer restates the total, which by construction equals the
 * invoice final amount exactly.
 */
export function InstallmentSchedule({
  installments,
  currency,
  precision,
}: {
  installments: readonly InstallmentView[]
  /** Required: a defaulted currency would silently mislabel a total. */
  currency: string
  precision: number
}) {
  if (installments.length === 0)
    return (
      <EmptyState
        title={installmentCopy.emptyTitle}
        description={installmentCopy.emptyDescription}
      />
    )

  const total = sum(
    installments.map((installment) => installment.amount),
    currency,
    precision
  )

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">{installmentCopy.plan}</caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                {installmentCopy.sequence}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                {installmentCopy.firstDueDate.replace("أول قسط", "القسط")}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                {installmentCopy.amount}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                {installmentCopy.paid}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                الحالة
              </th>
            </tr>
          </thead>
          <tbody>
            {installments.map((installment) => (
              <tr key={installment.id} className="border-t">
                <td className="px-4 py-3">
                  <FinanceBidiValue>{installment.sequence}</FinanceBidiValue>
                </td>
                <td className="px-4 py-3">
                  <FinanceBidiValue>
                    {formatDate(installment.dueDate)}
                  </FinanceBidiValue>
                </td>
                <td className="px-4 py-3">
                  <MoneyValue value={installment.amount} />
                </td>
                <td className="px-4 py-3">
                  <MoneyValue value={installment.paidAmount} />
                </td>
                <td className="px-4 py-3">
                  <InstallmentStatusBadge status={installment.status} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30 border-t">
            <tr>
              <td className="px-4 py-3 font-medium" colSpan={2}>
                الإجمالي
              </td>
              <td className="px-4 py-3 font-semibold" colSpan={3}>
                <MoneyValue value={total} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">{installmentCopy.sumNotice}</p>
    </div>
  )
}
