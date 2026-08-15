import { StatusBadge } from "@/shared/components/feedback/status-badge"
import type { ExpenseStatus } from "../types/common"
import { expenseStatusCopy } from "../config/accounting-copy"

type Tone = "success" | "warning" | "danger" | "neutral"

/** Tone is decorative; the Arabic label always carries the meaning. */
const tone: Record<ExpenseStatus, Tone> = {
  draft: "neutral",
  submitted: "warning",
  "under-review": "warning",
  "returned-for-revision": "warning",
  approved: "success",
  rejected: "danger",
  paid: "success",
  cancelled: "neutral",
}

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  return <StatusBadge label={expenseStatusCopy[status]} tone={tone[status]} />
}
