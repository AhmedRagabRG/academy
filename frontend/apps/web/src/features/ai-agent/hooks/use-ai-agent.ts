"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { aiAgentService } from "../services/active-ai-agent-service"
import type { UpdateAiAgentCommand } from "../types/domain"

export const aiAgentKeys = { all: ["ai-agent"] as const }

export function useAiAgents() {
  return useQuery({
    queryKey: aiAgentKeys.all,
    queryFn: ({ signal }) => aiAgentService.list(signal),
  })
}

export function useUpdateAiAgent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (command: UpdateAiAgentCommand) =>
      aiAgentService.update(command),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: aiAgentKeys.all })
      feedback.success("تم حفظ إعدادات المساعد")
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}
