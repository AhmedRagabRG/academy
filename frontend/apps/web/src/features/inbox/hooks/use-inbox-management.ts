"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { feedback } from "@/shared/components/feedback/toast"
import { inboxService } from "../services/active-inbox-service"
import { inboxKeys } from "../services/inbox-query-keys"
import type { AssignmentCommand } from "../types/commands"
import type { ConversationId, ConversationStatus, TagId } from "../types/common"

function useAiMode(action: "pause" | "resume") {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: ConversationId
      expectedVersion: number
    }) => inboxService.setAiMode(id, action, expectedVersion),
    onSuccess: async (_, { id }) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: inboxKeys.detail(id) }),
        client.invalidateQueries({ queryKey: inboxKeys.lists() }),
      ])
      feedback.success(
        action === "pause" ? "تم إيقاف المساعد" : "تم تشغيل المساعد"
      )
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export function usePauseAi() {
  return useAiMode("pause")
}

export function useResumeAi() {
  return useAiMode("resume")
}

export function useInboxManagement() {
  const client = useQueryClient()
  const finish = async (detail: { id: ConversationId }) => {
    client.setQueryData(inboxKeys.detail(detail.id), detail)
    await client.invalidateQueries({ queryKey: inboxKeys.lists() })
    await client.invalidateQueries({ queryKey: ["inbox", "dashboard"] })
    toast.success("تم تحديث المحادثة")
  }
  const fail = (error: Error) => toast.error(error.message)
  return {
    assign: useMutation({
      mutationFn: (command: AssignmentCommand) => inboxService.assign(command),
      onSuccess: finish,
      onError: fail,
    }),
    status: useMutation({
      mutationFn: ({
        id,
        status,
      }: {
        id: ConversationId
        status: ConversationStatus
      }) => inboxService.changeStatus(id, status),
      onSuccess: finish,
      onError: fail,
    }),
    tag: useMutation({
      mutationFn: ({ id, tagId }: { id: ConversationId; tagId: TagId }) =>
        inboxService.toggleTag(id, tagId),
      onSuccess: finish,
      onError: fail,
    }),
    archive: useMutation({
      mutationFn: (id: ConversationId) => inboxService.archive(id),
      onSuccess: finish,
      onError: fail,
    }),
    deleteConversation: useMutation({
      mutationFn: (id: ConversationId) => inboxService.delete(id),
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey: inboxKeys.all })
        toast.success("تم حذف المحادثة")
      },
      onError: fail,
    }),
    restore: useMutation({
      mutationFn: (id: ConversationId) => inboxService.restore(id),
      onSuccess: finish,
      onError: fail,
    }),
  }
}
