import { Badge } from "@workspace/ui/components/badge"
import { statusLabels } from "../config/inbox-config"
import type { ConversationView } from "../types/projections"
const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" })
function relative(iso: string) {
  const hours = Math.round((Date.parse(iso) - Date.now()) / 3600000)
  return Math.abs(hours) < 24
    ? rtf.format(hours, "hour")
    : rtf.format(Math.round(hours / 24), "day")
}
export function ConversationCard({
  row,
  selected,
  onSelect,
}: {
  row: ConversationView
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className="w-full rounded-xl p-3 text-start outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring data-[selected=true]:bg-primary/8"
      data-selected={selected}
    >
      <div className="flex">
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <strong className="truncate text-sm">{row.customer.name}</strong>
            <time
              className="shrink-0 text-xs text-muted-foreground"
              dateTime={row.lastActivityAt}
            >
              {relative(row.lastActivityAt)}
            </time>
          </span>
          <span
            className="mt-1 block truncate text-sm text-muted-foreground"
            dir="auto"
          >
            {row.lastMessage || "لا توجد رسائل"}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1">
            <Badge>{row.platform.label}</Badge>
            <Badge>{statusLabels[row.status]}</Badge>
            {row.tags.slice(0, 2).map((tag) => (
              <Badge key={tag.id}>{tag.label}</Badge>
            ))}
            {row.unreadCount > 0 && (
              <span
                className="ms-auto grid min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-primary-foreground"
                aria-label={`${row.unreadCount} رسائل غير مقروءة`}
              >
                {row.unreadCount}
              </span>
            )}
          </span>
          <span className="mt-2 block truncate text-xs text-muted-foreground">
            {row.team?.label ?? "بلا فريق"} ·{" "}
            {row.employee?.label ?? "بلا موظف"}
          </span>
        </span>
      </div>
    </button>
  )
}
