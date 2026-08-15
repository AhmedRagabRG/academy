"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ExpenseRequestId } from "../types/common"
import type { AddCommentCommand } from "../types/commands"
import { accountingService } from "../services/active-accounting-service"
import {
  accountingKeys,
  invalidationTargets,
} from "../services/accounting-query-keys"
import { AccountingError } from "../services/accounting-error"
import { accountingCopy } from "../config/accounting-copy"
import { useAccountingScopeFingerprint } from "./use-accounting-scope"

export function useRequestHistory(requestId: ExpenseRequestId, enabled = true) {
  const fingerprint = useAccountingScopeFingerprint()
  return useQuery({
    queryKey: accountingKeys.history(fingerprint, requestId),
    queryFn: ({ signal }) => accountingService.listHistory(requestId, signal),
    enabled: enabled && Boolean(requestId),
  })
}

export function useComments(requestId: ExpenseRequestId, enabled = true) {
  const fingerprint = useAccountingScopeFingerprint()
  return useQuery({
    queryKey: accountingKeys.comments(fingerprint, requestId),
    queryFn: ({ signal }) => accountingService.listComments(requestId, signal),
    enabled: enabled && Boolean(requestId),
  })
}

export function useAddComment() {
  const client = useQueryClient()
  const fingerprint = useAccountingScopeFingerprint()

  return useMutation({
    mutationFn: (command: AddCommentCommand) =>
      accountingService.addComment(command),
    onSuccess: async (comment) => {
      await Promise.all(
        invalidationTargets({
          kind: "comment",
          fingerprint,
          requestId: comment.requestId,
        }).map((queryKey) => client.invalidateQueries({ queryKey }))
      )
      toast.success("تمت إضافة التعليق")
    },
    onError: (error: unknown) => {
      if (error instanceof AccountingError) toast.error(error.message)
      else toast.error(accountingCopy.retry)
    },
  })
}
