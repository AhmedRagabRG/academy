import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { admissionStatusLabels } from "../config/admissions-copy"
import type { AdmissionStatus } from "../types/common"

export function AdmissionStatusBadge({ status }: { status: AdmissionStatus }) {
  const tone =
    status === "approved" || status === "enrolled"
      ? "success"
      : status === "rejected"
        ? "danger"
        : status === "submitted" || status === "under-review"
          ? "warning"
          : "neutral"
  return <StatusBadge label={admissionStatusLabels[status]} tone={tone} />
}
