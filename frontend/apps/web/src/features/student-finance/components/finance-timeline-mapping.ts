import {
  Ban,
  BadgePercent,
  CalendarClock,
  FileCheck,
  FilePlus,
  GraduationCap,
  Scale,
  Undo2,
  Wallet,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { TimelineItem, TimelineTone } from "@/shared/components/data-display/timeline"
import { formatMoney } from "@/shared/utils/money"
import type { FinanceEventCategory } from "../types/common"
import type { FinanceTimelineEvent } from "../types/domain"
import { timelineCopy } from "../config/finance-copy"

/**
 * Category presentation.
 *
 * Labels come from the single copy module rather than a second map here — two
 * lists of the same ten categories drift. Tone is decorative: the Arabic label
 * carries the meaning in every case, so an event is never distinguishable by
 * colour alone.
 */
export const eventCopy = timelineCopy.categories

const eventIcon: Record<FinanceEventCategory, LucideIcon> = {
  "invoice-created": FilePlus,
  "invoice-issued": FileCheck,
  "invoice-cancelled": Ban,
  "installment-plan-generated": CalendarClock,
  "payment-received": Wallet,
  "discount-applied": BadgePercent,
  "scholarship-applied": GraduationCap,
  "adjustment-recorded": Scale,
  "refund-requested": Undo2,
  "refund-completed": Undo2,
}

const eventTone: Record<FinanceEventCategory, TimelineTone> = {
  "invoice-created": "neutral",
  "invoice-issued": "warning",
  "invoice-cancelled": "neutral",
  "installment-plan-generated": "neutral",
  "payment-received": "success",
  "discount-applied": "neutral",
  "scholarship-applied": "success",
  "adjustment-recorded": "neutral",
  "refund-requested": "warning",
  "refund-completed": "danger",
}

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatEventTime(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

/** Every event carries its amount where it has one — a timeline of financial
 * events without figures makes the reader open each record to learn anything. */
export function toTimelineItem(event: FinanceTimelineEvent): TimelineItem {
  const amount = event.amount ? formatMoney(event.amount) : undefined
  return {
    id: event.id,
    occurredAt: event.occurredAt,
    occurredAtLabel: formatEventTime(event.occurredAt),
    title: amount ? `${eventCopy[event.category]} — ${amount}` : eventCopy[event.category],
    description: event.summary,
    actor: event.actor.name,
    icon: eventIcon[event.category],
    tone: eventTone[event.category],
  }
}

export const allEventCategories = Object.keys(eventCopy) as FinanceEventCategory[]
