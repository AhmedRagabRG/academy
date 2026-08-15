import {
  Timeline,
  type TimelineItem,
} from "@/shared/components/data-display/timeline"
import type { ConversationDetail } from "../types/projections"
export function ConversationTimeline({
  conversation,
}: {
  conversation: ConversationDetail
}) {
  const items: TimelineItem[] = [
    ...conversation.assignmentHistory.map((item) => ({
      id: item.id,
      title: "تحديث الإسناد",
      description: `${item.previous.employeeId ?? "—"} ← ${item.next.employeeId ?? "—"}`,
      actor: item.actorName,
      occurredAt: item.occurredAt,
      occurredAtLabel: new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(item.occurredAt)),
    })),
    ...conversation.systemEvents.map((item) => ({
      id: item.id,
      title: item.label,
      actor: item.actorName,
      occurredAt: item.occurredAt,
      occurredAtLabel: new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(item.occurredAt)),
    })),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  return (
    <section>
      <h3 className="mb-3 font-semibold">سجل المحادثة</h3>
      {items.length ? (
        <Timeline items={items} />
      ) : (
        <p className="text-sm text-muted-foreground">لا توجد أحداث بعد.</p>
      )}
    </section>
  )
}
