import { Card } from "@/shared/components/layout/card"
import { formatMoney } from "@/shared/utils/money"
import type { BatchDetail } from "../types/domain"
import { BatchStatusBadge } from "./batch-status-badge"
import { BatchCapacityIndicator } from "./batch-capacity-indicator"
import { BatchValue } from "./program-batch-value"
export function ProgramBatchDetails({ batch }: { batch: BatchDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <span className="text-sm text-muted-foreground">الرمز</span>
        <p className="mt-2 font-bold">
          <BatchValue>{batch.code}</BatchValue>
        </p>
      </Card>
      <Card>
        <span className="text-sm text-muted-foreground">الحالة</span>
        <div className="mt-2">
          <BatchStatusBadge status={batch.status} />
        </div>
      </Card>
      <Card>
        <span className="text-sm text-muted-foreground">السعة</span>
        <div className="mt-2">
          <BatchCapacityIndicator capacity={batch.capacity} />
        </div>
      </Card>
      <Card>
        <span className="text-sm text-muted-foreground">السعر</span>
        <p className="mt-2 font-bold">
          <BatchValue>
            {formatMoney(batch.financialProfile.programPrice)}
          </BatchValue>
        </p>
      </Card>
    </div>
  )
}
