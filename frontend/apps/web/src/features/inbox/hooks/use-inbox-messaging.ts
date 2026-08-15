"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { inboxService } from "../services/active-inbox-service"
import { inboxKeys } from "../services/inbox-query-keys"
import type { ReplyCommand } from "../types/commands"

export function useSendReply() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (command: ReplyCommand) => inboxService.sendReply(command),
    onSuccess: async (detail) => {
      client.setQueryData(inboxKeys.detail(detail.id), detail)
      await client.invalidateQueries({ queryKey: inboxKeys.lists() })
      toast.success("تم إرسال الرسالة")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
