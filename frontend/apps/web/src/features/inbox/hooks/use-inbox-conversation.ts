"use client"
import { useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { inboxService } from "../services/active-inbox-service"
import { inboxKeys } from "../services/inbox-query-keys"
import { useInboxWorkspaceStore } from "../stores/inbox-workspace-store"

export function useInboxConversation() {
  const id = useInboxWorkspaceStore((state) => state.selectedId)
  const client = useQueryClient()
  const markedId = useRef<string | null>(null)
  const query = useQuery({
    queryKey: inboxKeys.detail(id),
    queryFn: ({ signal }) => inboxService.detail(id!, signal),
    enabled: Boolean(id),
  })
  const read = useMutation({
    mutationFn: (conversationId: NonNullable<typeof id>) =>
      inboxService.markRead(conversationId),
    onSuccess: (detail) => {
      client.setQueryData(inboxKeys.detail(detail.id), detail)
      void client.invalidateQueries({ queryKey: inboxKeys.lists() })
      void client.invalidateQueries({ queryKey: ["inbox", "dashboard"] })
    },
  })
  useEffect(() => {
    if (id && query.data?.unreadCount && markedId.current !== id) {
      markedId.current = id
      read.mutate(id)
    }
  }, [id, query.data?.unreadCount, read])
  return query
}
