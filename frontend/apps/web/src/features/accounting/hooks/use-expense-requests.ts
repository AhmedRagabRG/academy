"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ExpenseRequestId } from "../types/common"
import type {
  CancelRequestCommand,
  CreateRequestCommand,
  SubmitRequestCommand,
  UpdateRequestCommand,
} from "../types/commands"
import { accountingService } from "../services/active-accounting-service"
import {
  accountingKeys,
  invalidationTargets,
} from "../services/accounting-query-keys"
import { AccountingError } from "../services/accounting-error"
import { accountingCopy } from "../config/accounting-copy"
import { useAccountingScopeFingerprint } from "./use-accounting-scope"

export function useExpenseRequest(requestId: ExpenseRequestId, enabled = true) {
  const fingerprint = useAccountingScopeFingerprint()
  return useQuery({
    queryKey: accountingKeys.request(fingerprint, requestId),
    queryFn: ({ signal }) => accountingService.getRequest(requestId, signal),
    enabled: enabled && Boolean(requestId),
  })
}

/**
 * Every command reports its outcome — a version conflict says the record moved
 * on rather than repeating a technical code, and nothing fails silently.
 */
const reportError = (error: unknown) => {
  if (error instanceof AccountingError)
    toast.error(
      error.code === "version-conflict" ? accountingCopy.conflict : error.message
    )
  else toast.error(accountingCopy.retry)
}

function useRequestMutation<TCommand>(
  run: (command: TCommand) => Promise<{ id: ExpenseRequestId }>,
  successMessage: (result: { id: ExpenseRequestId }) => string
) {
  const client = useQueryClient()
  const fingerprint = useAccountingScopeFingerprint()

  return useMutation({
    mutationFn: run,
    onSuccess: async (result) => {
      await Promise.all(
        invalidationTargets({
          kind: "request",
          fingerprint,
          requestId: result.id,
        }).map((queryKey) => client.invalidateQueries({ queryKey }))
      )
      toast.success(successMessage(result))
    },
    onError: reportError,
  })
}

export function useCreateRequest() {
  return useRequestMutation<CreateRequestCommand>(
    (command) => accountingService.createRequest(command),
    () => "تم حفظ الطلب كمسودة"
  )
}

export function useUpdateRequest() {
  return useRequestMutation<UpdateRequestCommand>(
    (command) => accountingService.updateRequest(command),
    () => "تم حفظ التعديلات"
  )
}

export function useSubmitRequest() {
  return useRequestMutation<SubmitRequestCommand>(
    (command) => accountingService.submitRequest(command),
    () => "تم تقديم الطلب للمراجعة"
  )
}

export function useCancelRequest() {
  return useRequestMutation<CancelRequestCommand>(
    (command) => accountingService.cancelRequest(command),
    () => "تم إلغاء الطلب"
  )
}
