"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { GenerateInstallmentPlanCommand, InstallmentListQuery } from "../types/commands"
import type { FinanceError } from "../services/finance-error"
import { studentFinanceService } from "../services/active-student-finance-service"
import {
  financeKeys,
  invalidationTargets,
} from "../services/finance-query-keys"
import { financeCopy } from "../config/finance-copy"
import { useFinanceScopeFingerprint } from "./use-finance-scope"

export function useInstallments(query: InstallmentListQuery) {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: financeKeys.installments(fingerprint, query),
    queryFn: ({ signal }) => studentFinanceService.listInstallments(query, signal),
    placeholderData: (previous) => previous,
  })
}

export function useGenerateInstallmentPlan(studentId: string) {
  const client = useQueryClient()
  const fingerprint = useFinanceScopeFingerprint()

  return useMutation({
    mutationFn: (command: GenerateInstallmentPlanCommand) =>
      studentFinanceService.generateInstallmentPlan(command),
    onSuccess: async (invoice) => {
      await Promise.all(
        invalidationTargets({
          kind: "installments",
          fingerprint,
          studentId,
          invoiceId: invoice.id,
        }).map((queryKey) => client.invalidateQueries({ queryKey }))
      )
      toast.success(`تم إنشاء خطة من ${invoice.installments.length} أقساط`)
    },
    onError: (error: FinanceError) => {
      toast.error(
        error.code === "version-conflict" ? financeCopy.conflict : error.message
      )
    },
  })
}

export function useInstallmentPolicy(invoiceId: string) {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: financeKeys.installmentPolicy(fingerprint, invoiceId as never),
    queryFn: ({ signal }) =>
      studentFinanceService.getInstallmentPolicy(invoiceId as never, signal),
    enabled: Boolean(invoiceId),
  })
}
