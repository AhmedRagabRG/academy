"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { inboxKeys } from "@/features/inbox/services/inbox-query-keys"
import { tagsService } from "../services/tags-service"
import type { CreateTagCommand, InboxTagId, UpdateTagCommand } from "../types/domain"

export const tagKeys = { all: ["tags"] as const }

export function useManagedTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: ({ signal }) => tagsService.list(signal),
  })
}

function useTagMutation<TVariables>(
  run: (variables: TVariables) => Promise<unknown>,
  success: string,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: tagKeys.all })
      // The inbox caches its own tag lookups, so a new or retired tag has to
      // invalidate those too or it will not appear in the conversation picker.
      await client.invalidateQueries({ queryKey: inboxKeys.all })
      feedback.success(success)
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export const useCreateTag = () =>
  useTagMutation((command: CreateTagCommand) => tagsService.create(command), "تم إنشاء الوسم")
export const useUpdateTag = () =>
  useTagMutation((command: UpdateTagCommand) => tagsService.update(command), "تم حفظ التغييرات")
export const useDeleteTag = () =>
  useTagMutation((id: InboxTagId) => tagsService.remove(id), "تم حذف الوسم")
