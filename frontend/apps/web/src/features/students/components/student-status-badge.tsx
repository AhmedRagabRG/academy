import { StatusBadge } from "@/shared/components/feedback/status-badge"
import type { StudentStatus } from "../types/common"
import { studentStatusCopy } from "../config/students-copy"

/** Tone is decorative; the Arabic label always carries the meaning. */
const tone: Record<StudentStatus, "success" | "warning" | "danger" | "neutral"> =
  {
    active: "success",
    suspended: "warning",
    graduated: "neutral",
    withdrawn: "danger",
    archived: "neutral",
  }

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  return <StatusBadge label={studentStatusCopy[status]} tone={tone[status]} />
}
