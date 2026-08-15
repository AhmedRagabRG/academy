"use client"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import type { ConversationDetail } from "../types/projections"
import type { InboxLookups } from "../services/inbox-service"
import type { TagId } from "../types/common"
import { useInboxManagement } from "../hooks/use-inbox-management"
export function ConversationTags({
  conversation,
  lookups,
  allowed,
}: {
  conversation: ConversationDetail
  lookups: InboxLookups
  allowed: boolean
}) {
  const { tag } = useInboxManagement()
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-medium">الوسوم</h4>
      <div className="flex flex-wrap gap-1">
        {conversation.tags.map((item) => (
          <Badge key={item.id}>
            {item.label}
            {allowed && (
              <button
                aria-label={`إزالة ${item.label}`}
                className="ms-1"
                onClick={() =>
                  tag.mutate({ id: conversation.id, tagId: item.id })
                }
              >
                ×
              </button>
            )}
          </Badge>
        ))}
      </div>
      {allowed && (
        <div className="flex flex-wrap gap-1">
          {lookups.tags
            .filter((item) => !conversation.tagIds.includes(item.id as TagId))
            .slice(0, 4)
            .map((item) => (
              <Button
                key={item.id}
                size="xs"
                variant="ghost"
                onClick={() =>
                  tag.mutate({ id: conversation.id, tagId: item.id as TagId })
                }
              >
                {item.label}
              </Button>
            ))}
        </div>
      )}
    </section>
  )
}
