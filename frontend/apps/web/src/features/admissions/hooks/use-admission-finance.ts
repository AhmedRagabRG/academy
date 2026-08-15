"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdmissionId } from "../types/common"
import { admissionsService } from "../services/active-admissions-service"
import { admissionKeys } from "../services/admissions-query-keys"

export function useAdmissionFinancialHistory(id: AdmissionId) {
  return useQuery({
    queryKey: admissionKeys.finances(id),
    queryFn: ({ signal }) => admissionsService.financialHistory(id, signal),
  })
}

export function usePrepareAdmissionFinancials() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: admissionsService.prepareFinancials,
    onSuccess: async (detail) => {
      client.setQueryData(admissionKeys.detail(detail.id), detail)
      await client.invalidateQueries({
        queryKey: admissionKeys.finances(detail.id),
      })
      toast.success("تم تحديث التجهيز المالي")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
