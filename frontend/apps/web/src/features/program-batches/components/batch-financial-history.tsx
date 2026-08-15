import { Card } from "@/shared/components/layout/card"
import { formatMoney } from "@/shared/utils/money"
import type { FinancialRevision } from "../types/domain"
export function BatchFinancialHistory({
  revisions,
}: {
  revisions: FinancialRevision[]
}) {
  return (
    <Card>
      <h2 className="font-heading text-lg font-bold">مراجعات التسعير</h2>
      <ol className="mt-4 space-y-2">
        {[...revisions].reverse().map((r) => (
          <li key={r.id} className="flex justify-between border-b py-2">
            <span>مراجعة {r.revisionNumber}</span>
            <bdi dir="ltr">{formatMoney(r.snapshot.programPrice)}</bdi>
          </li>
        ))}
      </ol>
    </Card>
  )
}
