import { cn } from "@workspace/ui/lib/utils"

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "danger" | "neutral" }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", tone === "success" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200", tone === "warning" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200", tone === "danger" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", tone === "neutral" && "bg-muted text-muted-foreground")}>{label}</span>
}
