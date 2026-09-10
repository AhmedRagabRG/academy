import {
  Timeline,
  type TimelineItem,
} from "@/shared/components/data-display/timeline"
import type { ConversationDetail } from "../types/projections"

const aiEventLabels: Record<string, string> = {
  "ai.reply.sent": "أرسل المساعد الذكي ردًا",
  "ai.reply.suppressed": "أُوقف رد المساعد الذكي",
  "ai.paused.human": "أُوقف المساعد بعد رد موظف",
  "ai.paused.manual": "أُوقف المساعد يدويًا",
  "ai.resumed": "استؤنف المساعد الذكي",
  "ai.handoff": "حوّل المساعد المحادثة إلى موظف",
}

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
      title: aiEventLabels[item.type] ?? item.label,
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
      <h3 className="mb-3 font-medium">سجل المحادثة</h3>
      {items.length ? (
        <Timeline items={items} />
      ) : (
        <p className="text-sm text-muted-foreground">لا توجد أحداث بعد.</p>
      )}
    </section>
  )
}
