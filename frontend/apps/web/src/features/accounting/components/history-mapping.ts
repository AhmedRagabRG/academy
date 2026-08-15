import {
  Ban,
  Check,
  FilePlus,
  RotateCcw,
  ScanEye,
  Send,
  Wallet,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type {
  TimelineItem,
  TimelineTone,
} from "@/shared/components/data-display/timeline"
import type { HistoryAction } from "../types/common"
import type { HistoryEntry } from "../types/domain"
import { expenseStatusCopy, historyCopy } from "../config/accounting-copy"

/**
 * Action presentation.
 *
 * Labels come from the single copy module rather than a second map here — two
 * lists of the same nine actions drift. Tone is decorative: the Arabic label
 * carries the meaning, so no entry is distinguishable by colour alone.
 */
export const actionCopy = historyCopy.actions

const actionIcon: Record<HistoryAction, LucideIcon> = {
  created: FilePlus,
  submitted: Send,
  "review-started": ScanEye,
  returned: RotateCcw,
  resubmitted: Send,
  approved: Check,
  rejected: X,
  paid: Wallet,
  cancelled: Ban,
}

const actionTone: Record<HistoryAction, TimelineTone> = {
  created: "neutral",
  submitted: "warning",
  "review-started": "warning",
  returned: "warning",
  resubmitted: "warning",
  approved: "success",
  rejected: "danger",
  paid: "success",
  cancelled: "neutral",
}

const formatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatHistoryMoment(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : formatter.format(parsed)
}

/**
 * Each entry states the statuses it moved between, because "returned" alone does
 * not say what it was returned *from* — and a reader reconstructing a disputed
 * sequence needs both ends of every hop.
 */
export function toTimelineItem(entry: HistoryEntry): TimelineItem {
  const transition = entry.fromStatus
    ? `${expenseStatusCopy[entry.fromStatus]} ← ${expenseStatusCopy[entry.toStatus]}`
    : expenseStatusCopy[entry.toStatus]

  return {
    id: entry.id,
    occurredAt: entry.occurredAt,
    occurredAtLabel: formatHistoryMoment(entry.occurredAt),
    title: actionCopy[entry.action],
    description: entry.note ? `${transition} · ${entry.note}` : transition,
    actor: entry.performedBy.name,
    icon: actionIcon[entry.action],
    tone: actionTone[entry.action],
  }
}

export const allHistoryActions = Object.keys(actionCopy) as HistoryAction[]
