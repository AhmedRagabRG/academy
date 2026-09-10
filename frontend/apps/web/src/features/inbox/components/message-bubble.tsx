import { Badge } from "@workspace/ui/components/badge"
import { Sparkles } from "lucide-react"
import type { Message } from "../types/domain"
import { MessageAttachment } from "./message-attachment"
const deliveryLabels: Record<Message["delivery"], string> = {
  received: "مستلمة",
  queued: "في انتظار الإرسال",
  sent: "مرسلة",
  delivered: "تم التسليم",
  read: "مقروءة",
  failed: "فشل الإرسال",
  suppressed: "تم إيقافها",
}
export function MessageBubble({ message }: { message: Message }) {
  const outgoing = message.direction === "outgoing"
  const suppressed = message.delivery === "suppressed"
  return (
    <article
      className={`flex ${outgoing ? "justify-start" : "justify-end"}`}
      aria-label={`${outgoing ? "رسالة صادرة" : "رسالة واردة"} من ${message.senderName}`}
    >
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${outgoing ? "rounded-tr-sm" : "rounded-tl-sm"} ${suppressed ? "bg-muted text-muted-foreground opacity-70" : outgoing ? "bg-primary text-primary-foreground" : "bg-muted"}`}
      >
        <div className="mb-1 flex items-center gap-2">
          <p className="text-xs font-medium opacity-80">{message.senderName}</p>
          {message.authorType === "ai-agent" && (
            <Badge className="gap-1 px-2 py-0.5 text-[10px]">
              <Sparkles aria-hidden="true" className="size-3" />
              الذكاء الاصطناعي
            </Badge>
          )}
        </div>
        {message.body && (
          <p
            dir="auto"
            className={`text-sm leading-6 whitespace-pre-wrap ${suppressed ? "line-through" : ""}`}
          >
            {message.body}
          </p>
        )}
        {message.attachments.map((attachment) => (
          <MessageAttachment key={attachment.id} attachment={attachment} />
        ))}
        {suppressed && (
          <p className="mt-2 text-xs">
            مسودة الذكاء الاصطناعي — تم إيقافها لأن موظفًا رد أولًا
          </p>
        )}
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
