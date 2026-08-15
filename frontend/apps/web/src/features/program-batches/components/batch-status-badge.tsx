import { StatusBadge } from "@/shared/components/feedback/status-badge"
import type { BatchStatus } from "../types/common"
const labels: Record<BatchStatus, string> = {
  draft: "مسودة",
  "registration-open": "التسجيل مفتوح",
  "registration-closed": "التسجيل مغلق",
  studying: "قيد الدراسة",
  graduated: "متخرج",
  archived: "مؤرشف",
}
export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <StatusBadge
      label={labels[status]}
      tone={
        status === "registration-open"
          ? "success"
          : status === "archived"
            ? "danger"
            : status === "draft"
              ? "neutral"
              : "warning"
      }
    />
  )
}
export { labels as batchStatusLabels }
