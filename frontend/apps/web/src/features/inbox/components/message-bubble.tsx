import type { Message } from "../types/domain"
import { MessageAttachment } from "./message-attachment"
const deliveryLabels: Record<Message["delivery"], string> = {
  received: "مستلمة",
  queued: "في انتظار الإرسال",
  sent: "مرسلة",
  delivered: "تم التسليم",
  read: "مقروءة",
  failed: "فشل الإرسال",
}
export function MessageBubble({ message }: { message: Message }) {
  const outgoing = message.direction === "outgoing"
  return (
    <article
      className={`flex ${outgoing ? "justify-start" : "justify-end"}`}
      aria-label={`${outgoing ? "رسالة صادرة" : "رسالة واردة"} من ${message.senderName}`}
    >
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${outgoing ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted"}`}
      >
        <p className="mb-1 text-xs font-medium opacity-80">
          {message.senderName}
        </p>
        {message.body && (
          <p dir="auto" className="text-sm leading-6 whitespace-pre-wrap">
            {message.body}
          </p>
        )}
        {message.attachments.map((attachment) => (
          <MessageAttachment key={attachment.id} attachment={attachment} />
        ))}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
          <time dateTime={message.sentAt}>
            {new Intl.DateTimeFormat("ar-EG", {
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(message.sentAt))}
          </time>
          {outgoing && <span>{deliveryLabels[message.delivery]}</span>}
        </div>
      </div>
    </article>
  )
}
