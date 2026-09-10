"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { aiKnowledgeService } from "../services/active-ai-knowledge-service"
import { aiKnowledgeKeys } from "../services/ai-knowledge-query-keys"
import { isIndexing, type KnowledgeBaseId } from "../types/domain"
import type {
  CreateFileSourceCommand,
  CreateKnowledgeBaseCommand,
  CreateTextSourceCommand,
  DeleteKnowledgeBaseCommand,
  SourceCommand,
  UpdateKnowledgeBaseCommand,
} from "../types/commands"

export function useKnowledgeBases() {
  return useQuery({
    queryKey: aiKnowledgeKeys.bases(),
    queryFn: ({ signal }) => aiKnowledgeService.list(signal),
  })
}

export function useKnowledgeSources(id: KnowledgeBaseId | undefined) {
  return useQuery({
    queryKey: id ? aiKnowledgeKeys.sources(id) : aiKnowledgeKeys.all,
    queryFn: ({ signal }) => aiKnowledgeService.sources(id!, signal),
    enabled: Boolean(id),
    // Indexing is asynchronous, so the page polls itself — but only while
    // something is actually pending, so a settled page stops hitting the API.
    refetchInterval: (query) =>
      query.state.data && isIndexing(query.state.data) ? 3000 : false,
  })
}

/** Every mutation refreshes both lists: source counts live on the base row. */
function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: aiKnowledgeKeys.all })
}

export function useCreateKnowledgeBase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (command: CreateKnowledgeBaseCommand) =>
      aiKnowledgeService.create(command),
    onSuccess: async () => {
      await invalidate()
      feedback.success("تم إنشاء قاعدة المعرفة")
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export function useUpdateKnowledgeBase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (command: UpdateKnowledgeBaseCommand) =>
      aiKnowledgeService.update(command),
    onSuccess: async () => {
      await invalidate()
      feedback.success("تم حفظ التغييرات")
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export function useDeleteKnowledgeBase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (command: DeleteKnowledgeBaseCommand) =>
      aiKnowledgeService.remove(command),
    onSuccess: async () => {
      await invalidate()
      feedback.success("تم حذف قاعدة المعرفة")
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export function useAddFileSource() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (command: CreateFileSourceCommand) =>
      aiKnowledgeService.addFileSource(command),
    onSuccess: async () => {
      await invalidate()
      feedback.success("تم رفع الملف، وبدأت الفهرسة")
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export function useAddTextSource() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (command: CreateTextSourceCommand) =>
      aiKnowledgeService.addTextSource(command),
    onSuccess: async () => {
      await invalidate()
      feedback.success("تمت إضافة النص، وبدأت الفهرسة")
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export function useRemoveSource() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (command: SourceCommand) =>
      aiKnowledgeService.removeSource(command),
    onSuccess: async () => {
      await invalidate()
      feedback.success("تم حذف المصدر")
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export function useReindexSource() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (command: SourceCommand) =>
      aiKnowledgeService.reindexSource(command),
    onSuccess: async () => {
      await invalidate()
      feedback.success("أُعيدت جدولة الفهرسة")
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}
