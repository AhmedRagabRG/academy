"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  ApplyDiscountCommand,
  AwardScholarshipCommand,
} from "../types/commands"
import type { FinanceError } from "../services/finance-error"
import { studentFinanceService } from "../services/active-student-finance-service"
import { invalidationTargets } from "../services/finance-query-keys"
import { financeCopy } from "../config/finance-copy"
import { useFinanceScopeFingerprint } from "./use-finance-scope"

export function useApplyDiscount(studentId: string) {
  const client = useQueryClient()
  const fingerprint = useFinanceScopeFingerprint()

  return useMutation({
    mutationFn: (command: ApplyDiscountCommand) =>
      studentFinanceService.applyDiscount(command),
    onSuccess: async (invoice) => {
      await Promise.all(
        invalidationTargets({
          kind: "reduction",
          fingerprint,
          studentId,
          invoiceId: invoice.id,
        }).map((queryKey) => client.invalidateQueries({ queryKey }))
      )
      toast.success(
        invoice.issuedSnapshot
          ? "تم تسجيل الخصم كتسوية على الرصيد غير المسدد"
          : "تم تطبيق الخصم على الفاتورة"
      )
    },
    onError: (error: FinanceError) => {
      toast.error(
        error.code === "version-conflict" ? financeCopy.conflict : error.message
      )
    },
  })
}

export function useAwardScholarship(studentId: string) {
  const client = useQueryClient()
  const fingerprint = useFinanceScopeFingerprint()

  return useMutation({
    mutationFn: (command: AwardScholarshipCommand) =>
      studentFinanceService.awardScholarship(command),
    onSuccess: async () => {
      await Promise.all(
        invalidationTargets({ kind: "reduction", fingerprint, studentId }).map(
          (queryKey) => client.invalidateQueries({ queryKey })
        )
      )
      toast.success("تم اعتماد المنحة الدراسية")
    },
    onError: (error: FinanceError) => toast.error(error.message),
  })
}
