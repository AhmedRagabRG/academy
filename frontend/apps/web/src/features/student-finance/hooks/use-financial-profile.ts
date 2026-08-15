"use client"

import { useQuery } from "@tanstack/react-query"
import { studentFinanceService } from "../services/active-student-finance-service"
import { financeKeys } from "../services/finance-query-keys"
import { useFinanceScopeFingerprint } from "./use-finance-scope"

export function useStudentFinancialProfile(studentId: string, enabled = true) {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: financeKeys.profile(fingerprint, studentId),
    queryFn: ({ signal }) =>
      studentFinanceService.getStudentFinancialProfile(studentId, signal),
    enabled,
  })
}
