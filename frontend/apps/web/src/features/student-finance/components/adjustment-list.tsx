import { Card } from "@/shared/components/layout/card"
import type { FinancialAdjustment } from "../types/domain"
import { FinanceBidiValue } from "./finance-area-states"
import { MoneyValue } from "./money-value"
import { formatFinanceDate } from "./discount-history"

const sourceLabel: Record<FinancialAdjustment["sourceKind"], string> = {
  discount: "خصم",
  scholarship: "منحة دراسية",
}

/**
 * Post-issuance reductions, shown apart from the invoice's own figures.
 *
 * Keeping them visually separate is the point: it makes it evident that the
 * issued document was never rewritten, and that the balance moved because an
 * adjustment was recorded against it (spec FR-007 + FR-023).
 */
export function AdjustmentList({
  adjustments,
}: {
  adjustments: readonly FinancialAdjustment[]
}) {
  if (adjustments.length === 0) return null

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-medium">تسويات بعد الإصدار</h3>
        <p className="text-muted-foreground text-sm">
          هذه التسويات تخفض الرصيد غير المسدد والأقساط غير المدفوعة. قيم الفاتورة
          الصادرة لم تتغير.
        </p>
      </div>
      <ul className="space-y-3 text-sm">
        {adjustments.map((adjustment) => (
          <li
            key={adjustment.id}
            className="flex flex-wrap justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="font-medium">
                <MoneyValue value={adjustment.amount} />
                <span className="text-muted-foreground me-2 ms-2 text-xs">
                  {sourceLabel[adjustment.sourceKind]}
                </span>
              </p>
              <p className="text-muted-foreground">{adjustment.reason}</p>
            </div>
            <p className="text-muted-foreground text-xs">
              اعتمده {adjustment.approvedBy.name} ·{" "}
              <FinanceBidiValue>
                {formatFinanceDate(adjustment.createdAt)}
              </FinanceBidiValue>
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
