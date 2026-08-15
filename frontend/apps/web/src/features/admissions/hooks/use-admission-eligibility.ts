"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { admissionsService } from "../services/active-admissions-service"
import { admissionKeys } from "../services/admissions-query-keys"

export function useChangeAdmissionSelection() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: admissionsService.changeSelection,
    onSuccess: async (detail) => {
      client.setQueryData(admissionKeys.detail(detail.id), detail)
      await client.invalidateQueries({ queryKey: admissionKeys.all })
      toast.success("تم تحديث الاختيار الأكاديمي")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
