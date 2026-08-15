import type { Message } from "../types/domain"
import { MessageBubble } from "./message-bubble"
export function MessageList({ messages }: { messages: Message[] }) {
  const formatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[radial-gradient(circle_at_center,var(--muted)_0.5px,transparent_0.5px)] bg-[length:16px_16px] p-4"
      role="log"
      aria-label="سجل الرسائل"
      aria-live="polite"
    >
      {messages.map((message, index) => {
        const nextDay = formatter.format(new Date(message.sentAt))
        const previous = messages[index - 1]
        const separator =
          !previous || formatter.format(new Date(previous.sentAt)) !== nextDay
        return (
          <div key={message.id} className="space-y-3">
            {separator && (
              <div className="mx-auto w-fit rounded-full bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
                {nextDay}
              </div>
            )}
            <MessageBubble message={message} />
          </div>
        )
      })}
    </div>
  )
}
