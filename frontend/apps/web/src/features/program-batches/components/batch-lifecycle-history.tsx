import { Card } from "@/shared/components/layout/card"
import type { LifecycleEvent } from "../types/domain"
import { BatchStatusBadge } from "./batch-status-badge"
export function BatchLifecycleHistory({
  events,
}: {
  events: LifecycleEvent[]
}) {
  return (
    <Card>
      <h2 className="font-heading text-lg font-bold">سجل دورة الحياة</h2>
      <ol className="mt-4 space-y-3">
        {[...events].reverse().map((event) => (
          <li
            key={event.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
          >
            <BatchStatusBadge status={event.toStatus} />
            <span className="text-sm text-muted-foreground">
              {event.reason ?? "إنشاء السجل"} ·{" "}
              <bdi dir="ltr">
                {new Date(event.occurredAt).toLocaleDateString("ar-EG")}
              </bdi>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  )
}
