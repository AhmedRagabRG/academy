import { Badge } from "@workspace/ui/components/badge"
import { statusLabels } from "../config/inbox-config"
import type { ConversationDetail } from "../types/projections"
export function ConversationHeader({
  conversation,
  actions,
}: {
  conversation: ConversationDetail
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
      <div className="flex min-w-0 items-center">
        <div className="min-w-0">
          <h2 id="conversation-title" className="truncate font-semibold">
            {conversation.customer.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge>{conversation.platform.label}</Badge>
            <Badge>{statusLabels[conversation.status]}</Badge>
            {conversation.tags.map((tag) => (
              <Badge key={tag.id}>{tag.label}</Badge>
            ))}
          </div>
        </div>
      </div>
      {actions}
    </header>
  )
}
