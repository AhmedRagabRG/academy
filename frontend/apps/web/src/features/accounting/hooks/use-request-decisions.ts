"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ExpenseRequestId } from "../types/common"
import type {
  DecideRequestCommand,
  MarkPaidCommand,
  StartReviewCommand,
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

function useDecisionMutation<TCommand>(
  run: (command: TCommand) => Promise<{ id: ExpenseRequestId }>,
  message: (result: { id: ExpenseRequestId }) => string
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
      toast.success(message(result))
    },
    onError: reportError,
  })
}

export function useStartReview() {
  return useDecisionMutation<StartReviewCommand>(
    (command) => accountingService.startReview(command),
    () => "بدأت مراجعة الطلب وسُجّلت باسمك"
  )
}

export function useMarkPaid() {
  return useDecisionMutation<MarkPaidCommand>(
    (command) => accountingService.markPaid(command),
    () => "تم تسجيل سداد الطلب"
  )
}

export function useDecideRequest() {
  const client = useQueryClient()
  const fingerprint = useAccountingScopeFingerprint()

  return useMutation({
    mutationFn: (command: DecideRequestCommand) =>
      accountingService.decideRequest(command),
    onSuccess: async (request) => {
      await Promise.all(
        invalidationTargets({
          kind: "request",
          fingerprint,
          requestId: request.id,
        }).map((queryKey) => client.invalidateQueries({ queryKey }))
      )
      toast.success(
        request.status === "approved"
          ? "تم اعتماد الطلب"
          : request.status === "rejected"
            ? "تم رفض الطلب"
            : "أُعيد الطلب للتعديل"
      )
    },
    onError: reportError,
  })
}
