import { Button } from "@workspace/ui/components/button"
import type { InboxListQuery } from "../types/commands"
import type { InboxLookups } from "../services/inbox-service"
export function InboxToolbar({
  query,
  lookups,
  onChange,
}: {
  query: InboxListQuery
  lookups: InboxLookups
  onChange: (patch: Partial<InboxListQuery>) => void
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="فرز وتصفية المحادثات"
    >
      <select
        aria-label="ترتيب المحادثات"
        value={query.sort}
        onChange={(event) =>
          onChange({ sort: event.target.value as InboxListQuery["sort"] })
        }
        className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
      >
        <option value="latest">الأحدث نشاطًا</option>
        <option value="oldest">الأقدم نشاطًا</option>
        <option value="unread">غير المقروء أولًا</option>
      </select>
      <select
        aria-label="تصفية حسب الحالة"
        value={query.statuses[0] ?? ""}
        onChange={(event) =>
          onChange({
            statuses: event.target.value ? [event.target.value as never] : [],
          })
        }
        className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
      >
        <option value="">كل الحالات</option>
        {lookups.statuses.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <select
        aria-label="تصفية حسب المنصة"
        value={query.platforms[0] ?? ""}
        onChange={(event) =>
          onChange({
            platforms: event.target.value ? [event.target.value] : [],
          })
        }
        className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
      >
        <option value="">كل المنصات</option>
        {lookups.platforms.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant={query.unreadOnly ? "secondary" : "outline"}
        onClick={() => onChange({ unreadOnly: !query.unreadOnly })}
      >
        غير المقروءة فقط
      </Button>
    </div>
  )
}
