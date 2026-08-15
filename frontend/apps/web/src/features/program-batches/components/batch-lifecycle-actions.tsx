"use client"
import type { BatchDetail } from "../types/domain"
import type { BatchStatus } from "../types/common"
import { transitions } from "../utils/batch-lifecycle"
import { BatchPermission } from "./program-batch-permission-boundary"
import { BatchTransitionDialog } from "./batch-transition-dialog"
import { useBatchMutations } from "../hooks/use-program-batch-mutations"
const labels: Partial<Record<BatchStatus, string>> = {
  "registration-open": "فتح التسجيل",
  "registration-closed": "إغلاق التسجيل",
  studying: "بدء الدراسة",
  graduated: "تخريج الدفعة",
  archived: "أرشفة",
  draft: "إعادة إلى مسودة",
}
const permissions: Record<BatchStatus, string> = {
  draft: "batches.registration.correct",
  "registration-open": "batches.registration.open",
  "registration-closed": "batches.registration.close",
  studying: "batches.study.start",
  graduated: "batches.graduate",
  archived: "batches.archive",
}
export function BatchLifecycleActions({ batch }: { batch: BatchDetail }) {
  const mutation = useBatchMutations().transition
  return (
    <div className="flex flex-wrap gap-2">
      {transitions[batch.status].map((to) => (
        <BatchPermission key={to} permission={permissions[to]}>
          <BatchTransitionDialog
            label={labels[to] ?? to}
            destructive={to === "archived"}
            pending={mutation.isPending}
            onConfirm={(reason) =>
              mutation.mutate({
                programId: batch.programId,
                batchId: batch.id,
                toStatus: to,
                reason,
                expectedVersion: batch.version,
              })
            }
          />
        </BatchPermission>
      ))}
    </div>
  )
}
