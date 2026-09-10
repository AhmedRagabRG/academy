"use client"
import { usePermission } from "@/shared/hooks/use-permission"
import { LoadingState } from "@/shared/components/states/loading-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { inboxPermissions } from "../config/inbox-permissions"
import type { InboxLookups } from "../services/inbox-service"
import { useInboxConversation } from "../hooks/use-inbox-conversation"
import { useInboxWorkspaceStore } from "../stores/inbox-workspace-store"
import { ConversationHeader } from "../components/conversation-header"
import { MessageList } from "../components/message-list"
import { MessageComposer } from "../components/message-composer"
import { AssignmentDialog } from "../components/assignment-dialog"
import { ConversationStatusActions } from "../components/conversation-status-actions"
import { InboxResponsiveNavigation } from "../components/inbox-responsive-navigation"
import { AiControlPanel } from "../components/ai-control-panel"

export function ConversationWorkspace({ lookups }: { lookups: InboxLookups }) {
  const conversation = useInboxConversation()
  const select = useInboxWorkspaceStore((state) => state.select)
  const setPane = useInboxWorkspaceStore((state) => state.setMobilePane)
  const canReply = usePermission(inboxPermissions.reply)
  const canAssignEmployee = usePermission(inboxPermissions.assignEmployee)
  const canAssignTeam = usePermission(inboxPermissions.assignTeam)
  const canAssign = canAssignEmployee || canAssignTeam
  const canStatus = usePermission(inboxPermissions.changeStatus)
  const canArchive = usePermission(inboxPermissions.archive)
  const canRestore = usePermission(inboxPermissions.restore)
  const canDelete = usePermission(inboxPermissions.delete)
  if (conversation.isLoading)
    return <LoadingState label="جارٍ تحميل المحادثة" />
  if (conversation.error)
    return (
      <ErrorState
        message={conversation.error.message}
        onRetry={() => void conversation.refetch()}
      />
    )
  if (!conversation.data)
    return (
      <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground">
        اختر محادثة من القائمة لبدء العمل.
      </div>
    )
  const detail = conversation.data
  return (
    <>
      <InboxResponsiveNavigation
        onBack={() => {
          select(null)
          setPane("list")
        }}
        onDetails={() => setPane("details")}
      />
      <ConversationHeader
        conversation={detail}
        actions={
          <div className="flex gap-2">
            <AssignmentDialog
              conversation={detail}
              lookups={lookups}
              allowed={canAssign}
            />
            <ConversationStatusActions
              conversation={detail}
              canChange={canStatus}
              canArchive={canArchive}
              canRestore={canRestore}
              canDelete={canDelete}
            />
          </div>
        }
      />
      <div className="border-b p-3">
        <AiControlPanel conversation={detail} />
      </div>
      <MessageList messages={detail.messages} />
      <MessageComposer conversationId={detail.id} allowed={canReply} />
    </>
  )
}
