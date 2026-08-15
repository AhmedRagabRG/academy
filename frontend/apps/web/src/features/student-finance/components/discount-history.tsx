import { Card } from "@/shared/components/layout/card"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { Discount } from "../types/domain"
import { discountCopy } from "../config/finance-copy"
import { FinanceBidiValue } from "./finance-area-states"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })

export function formatFinanceDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

/**
 * Discounts recorded against an invoice, each with its value, reason, approver
 * and time — the audit trail the spec asks for (FR-024), not just a total.
 */
export function DiscountHistory({
  discounts,
}: {
  discounts: readonly Discount[]
}) {
  if (discounts.length === 0)
    return <EmptyState title={discountCopy.emptyTitle} />

  return (
    <Card>
      <h3 className="mb-3 font-medium">{discountCopy.title}</h3>
      <ul className="space-y-3 text-sm">
        {discounts.map((discount) => (
          <li key={discount.id} className="flex flex-wrap justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">
                <FinanceBidiValue>
                  {discount.kind === "percentage"
                    ? `${discount.value}%`
                    : discount.value}
                </FinanceBidiValue>
              </p>
              <p className="text-muted-foreground">{discount.reason}</p>
            </div>
            <p className="text-muted-foreground text-xs">
              {discountCopy.approvedBy} {discount.approvedBy.name} ·{" "}
              <FinanceBidiValue>
                {formatFinanceDate(discount.approvedAt)}
              </FinanceBidiValue>
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
