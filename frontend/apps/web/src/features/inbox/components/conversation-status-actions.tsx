"use client"
import { Button } from "@workspace/ui/components/button"
import type { ConversationDetail } from "../types/projections"
import type { ConversationStatus } from "../types/common"
import { statusLabels } from "../config/inbox-config"
import { useInboxManagement } from "../hooks/use-inbox-management"
export function ConversationStatusActions({
  conversation,
  canChange,
  canArchive,
  canRestore,
  canDelete,
}: {
  conversation: ConversationDetail
  canChange: boolean
  canArchive: boolean
  canRestore: boolean
  canDelete: boolean
}) {
  const management = useInboxManagement()
  return (
    <div className="flex items-center gap-2">
      {canChange && (
        <select
          aria-label="حالة المحادثة"
          className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
          value={conversation.status}
          onChange={(event) =>
            management.status.mutate({
              id: conversation.id,
              status: event.target.value as ConversationStatus,
            })
          }
        >
          {Object.entries(statusLabels)
            .filter(([id]) => id !== "archived")
            .map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
        </select>
      )}
      {conversation.status !== "archived" && canArchive && (
        <Button
          size="sm"
          variant="ghost"
          aria-label="أرشفة المحادثة"
          onClick={() => management.archive.mutate(conversation.id)}
        >
          أرشفة
        </Button>
      )}
      {conversation.status === "archived" && canRestore && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => management.restore.mutate(conversation.id)}
        >
          استعادة
        </Button>
      )}
      {canDelete && (
        <Button
          size="sm"
          variant="ghost"
          aria-label="حذف المحادثة"
          onClick={() => management.deleteConversation.mutate(conversation.id)}
        >
          حذف
        </Button>
      )}
    </div>
  )
}
