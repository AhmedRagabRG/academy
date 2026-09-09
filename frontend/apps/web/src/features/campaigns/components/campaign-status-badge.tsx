import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import {
  campaignStatusLabel,
  recipientStatusLabel,
} from "../config/campaign-copy"
import type { CampaignStatus, RecipientStatus } from "../types/domain"

const tones: Record<CampaignStatus | RecipientStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  running:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  paused: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  completed: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  cancelled:
    "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  sending: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  sent: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  delivered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  read: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  skipped: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  uncertain:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge className={cn("whitespace-nowrap", tones[status])}>
      {campaignStatusLabel[status]}
    </Badge>
  )
}

export function RecipientStatusBadge({ status }: { status: RecipientStatus }) {
  return (
    <Badge className={cn("whitespace-nowrap", tones[status])}>
      {recipientStatusLabel[status]}
    </Badge>
  )
}
