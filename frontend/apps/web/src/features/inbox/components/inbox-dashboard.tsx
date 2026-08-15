import { StatCard } from "@/shared/components/layout/stat-card"
import type { InboxDashboard as Dashboard } from "../types/projections"
export function InboxDashboard({ data }: { data: Dashboard }) {
  const items = [
    ["مسندة إليّ", data.assigned],
    ["مفتوحة", data.open],
    ["قيد الانتظار", data.pending],
    ["غير مقروءة", data.unread],
    ["أغلقت اليوم", data.closedToday],
  ] as const
  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
      {items.map(([label, value]) => (
        <StatCard key={label} label={label} value={String(value)} />
      ))}
    </div>
  )
}
