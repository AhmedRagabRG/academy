"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  RemoveAttachmentCommand,
  UploadAttachmentCommand,
} from "../types/commands"
import { accountingService } from "../services/active-accounting-service"
import { invalidationTargets } from "../services/accounting-query-keys"
import { AccountingError } from "../services/accounting-error"
import { accountingCopy } from "../config/accounting-copy"
import { useAccountingScopeFingerprint } from "./use-accounting-scope"

const reportError = (error: unknown) => {
  if (error instanceof AccountingError)
    toast.error(
      error.code === "version-conflict" ? accountingCopy.conflict : error.message
    )
  else toast.error(accountingCopy.retry)
}

export function useUploadAttachment() {
  const client = useQueryClient()
  const fingerprint = useAccountingScopeFingerprint()

  return useMutation({
    mutationFn: (command: UploadAttachmentCommand) =>
      accountingService.uploadAttachment(command),
    onSuccess: async (request) => {
      await Promise.all(
        invalidationTargets({
          kind: "attachment",
          fingerprint,
          requestId: request.id,
        }).map((queryKey) => client.invalidateQueries({ queryKey }))
      )
      toast.success("تم رفع المستند")
    },
    onError: reportError,
  })
}

export function useRemoveAttachment() {
  const client = useQueryClient()
  const fingerprint = useAccountingScopeFingerprint()

  return useMutation({
    mutationFn: (command: RemoveAttachmentCommand) =>
      accountingService.removeAttachment(command),
    onSuccess: async (request) => {
      await Promise.all(
        invalidationTargets({
          kind: "attachment",
          fingerprint,
          requestId: request.id,
        }).map((queryKey) => client.invalidateQueries({ queryKey }))
      )
      toast.success("تمت إزالة المستند")
    },
    onError: reportError,
  })
}
