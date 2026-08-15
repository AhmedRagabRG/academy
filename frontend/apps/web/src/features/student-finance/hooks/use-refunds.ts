"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  CompleteRefundCommand,
  DecideRefundCommand,
  RefundListQuery,
  RequestRefundCommand,
} from "../types/commands"
import type { FinanceError } from "../services/finance-error"
import { studentFinanceService } from "../services/active-student-finance-service"
import { financeKeys, invalidationTargets } from "../services/finance-query-keys"
import { financeCopy } from "../config/finance-copy"
import { useFinanceScopeFingerprint } from "./use-finance-scope"

export function useRefunds(query: RefundListQuery) {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: financeKeys.refunds(fingerprint, query),
    queryFn: ({ signal }) => studentFinanceService.listRefunds(query, signal),
    placeholderData: (previous) => previous,
  })
}

const reportError = (error: FinanceError) =>
  toast.error(
    error.code === "version-conflict" ? financeCopy.conflict : error.message
  )

export function useRequestRefund(studentId: string) {
  const client = useQueryClient()
  const fingerprint = useFinanceScopeFingerprint()

  return useMutation({
    mutationFn: (command: RequestRefundCommand) =>
      studentFinanceService.requestRefund(command),
    onSuccess: async (refund) => {
      await Promise.all(
        invalidationTargets({
          kind: "refund",
          fingerprint,
          studentId,
          invoiceId: refund.invoiceId,
        }).map((queryKey) => client.invalidateQueries({ queryKey }))
      )
      // A request is not money moving, and the message says so.
      toast.success("تم تسجيل طلب الاسترداد بانتظار الاعتماد")
    },
    onError: reportError,
  })
}

/**
 * Approving, rejecting, and completing all go through the same mutation surface
 * because they share invalidation — but each carries its own permission, checked
 * by the service on every call.
 */
export function useDecideRefund(studentId: string) {
  const client = useQueryClient()
  const fingerprint = useFinanceScopeFingerprint()

  const invalidate = (invoiceId: string) =>
    Promise.all(
      invalidationTargets({
        kind: "refund",
        fingerprint,
        studentId,
        invoiceId: invoiceId as Parameters<
          typeof invalidationTargets
        >[0]["invoiceId"],
      }).map((queryKey) => client.invalidateQueries({ queryKey }))
    )

  const decide = useMutation({
    mutationFn: (command: DecideRefundCommand) =>
      studentFinanceService.decideRefund(command),
    onSuccess: async (refund) => {
      await invalidate(refund.invoiceId)
      toast.success(
        refund.status === "approved"
          ? "تم اعتماد طلب الاسترداد"
          : "تم رفض طلب الاسترداد"
      )
    },
    onError: reportError,
  })

  const complete = useMutation({
    mutationFn: (command: CompleteRefundCommand) =>
      studentFinanceService.completeRefund(command),
    onSuccess: async (refund) => {
      await invalidate(refund.invoiceId)
      toast.success("تم إتمام الاسترداد وتحديث الرصيد")
    },
    onError: reportError,
  })

  return { decide, complete }
}
