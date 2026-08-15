"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { inboxService } from "../services/active-inbox-service"
import { inboxKeys } from "../services/inbox-query-keys"
import type { ConversationId, NoteId } from "../types/common"

export function useInboxNotes(conversationId: ConversationId) {
  const client = useQueryClient()
  const refresh = async () => {
    await client.invalidateQueries({
      queryKey: inboxKeys.detail(conversationId),
    })
    toast.success("تم تحديث الملاحظات")
  }
  const fail = (error: Error) => toast.error(error.message)
  return {
    add: useMutation({
      mutationFn: (content: string) =>
        inboxService.addNote(conversationId, content),
      onSuccess: refresh,
      onError: fail,
    }),
    edit: useMutation({
      mutationFn: ({ noteId, content }: { noteId: NoteId; content: string }) =>
        inboxService.editNote(conversationId, noteId, content),
      onSuccess: refresh,
      onError: fail,
    }),
    remove: useMutation({
      mutationFn: (noteId: NoteId) =>
        inboxService.deleteNote(conversationId, noteId),
      onSuccess: refresh,
      onError: fail,
    }),
  }
}
