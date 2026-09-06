import { cn } from "@workspace/ui/lib/utils"
import { priorityLabels, sourceLabels } from "../config/pipeline-configuration"
import type { LeadPriority, LeadSource, PipelineStage } from "../types/domain"

const priorityClasses: Record<LeadPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  high: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  urgent: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
}

const sourceClasses: Record<LeadSource, string> = {
  whatsapp: "text-emerald-700 dark:text-emerald-300",
  instagram: "text-fuchsia-700 dark:text-fuchsia-300",
  facebook: "text-blue-700 dark:text-blue-300",
  website: "text-sky-700 dark:text-sky-300",
  phone: "text-amber-700 dark:text-amber-300",
  manual: "text-muted-foreground",
}

export const stageAccentClasses: Record<PipelineStage["accent"], string> = {
  slate: "bg-slate-500",
  blue: "bg-brand-blue",
  sky: "bg-sky-500",
  amber: "bg-brand-gold",
  violet: "bg-violet-500",
  green: "bg-emerald-600",
  red: "bg-red-600",
}

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-1 text-[0.7rem] font-medium",
        priorityClasses[priority]
      )}
    >
      {priorityLabels[priority]}
    </span>
  )
}

export function SourceLabel({ source }: { source: LeadSource }) {
  return (
    <span className={cn("text-xs font-medium", sourceClasses[source])}>
      {sourceLabels[source]}
    </span>
  )
}

export function formatPipelineMoney(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPipelineDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value))
}
