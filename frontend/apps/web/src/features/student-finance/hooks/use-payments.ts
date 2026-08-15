"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { InvoiceId } from "../types/common"
import type { PaymentListQuery, RecordPaymentCommand } from "../types/commands"
import type { FinanceError } from "../services/finance-error"
import { studentFinanceService } from "../services/active-student-finance-service"
import {
  financeKeys,
  invalidationTargets,
} from "../services/finance-query-keys"
import { financeCopy } from "../config/finance-copy"
import { useFinanceScopeFingerprint } from "./use-finance-scope"

export function usePayments(query: PaymentListQuery) {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: financeKeys.payments(fingerprint, query),
    queryFn: ({ signal }) => studentFinanceService.listPayments(query, signal),
    placeholderData: (previous) => previous,
  })
}

export function useInvoicePayments(invoiceId: InvoiceId, enabled = true) {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: [...financeKeys.invoice(fingerprint, invoiceId), "payments"],
    queryFn: ({ signal }) =>
      studentFinanceService.listInvoicePayments(invoiceId, signal),
    enabled,
  })
}

/**
 * Recording a payment invalidates the invoice, both queues, the installments, the
 * student profile, the timeline, **and** Student Management's financial-summary
 * key — so the finance workspace and the student workspace can never display
 * different numbers.
 */
export function useRecordPayment(studentId: string) {
  const client = useQueryClient()
  const fingerprint = useFinanceScopeFingerprint()

  return useMutation({
    mutationFn: (command: RecordPaymentCommand) =>
      studentFinanceService.recordPayment(command),
    onSuccess: async (payment) => {
      await Promise.all(
        invalidationTargets({
          kind: "payment",
          fingerprint,
          studentId,
          invoiceId: payment.invoiceId,
        }).map((queryKey) => client.invalidateQueries({ queryKey }))
      )
      toast.success(`تم تسجيل الدفعة بإيصال ${payment.receiptNumber}`)
    },
    onError: (error: FinanceError) => {
      toast.error(
        error.code === "version-conflict" ? financeCopy.conflict : error.message
      )
    },
  })
}
