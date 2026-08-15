"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { admissionsService } from "../services/active-admissions-service"
import { admissionKeys } from "../services/admissions-query-keys"
import type { AdmissionId } from "../types/common"

export function useAdmission(id: AdmissionId) {
  return useQuery({
    queryKey: admissionKeys.detail(id),
    queryFn: ({ signal }) => admissionsService.get(id, signal),
  })
}

export function useCreateAdmission() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: admissionsService.create,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: admissionKeys.lists() })
      toast.success("تم حفظ طلب القبول")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateAdmission() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: admissionsService.update,
    onSuccess: async (detail) => {
      client.setQueryData(admissionKeys.detail(detail.id), detail)
      await client.invalidateQueries({ queryKey: admissionKeys.lists() })
      toast.success("تم تحديث الطلب")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useArchiveApplicant() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: admissionsService.archiveApplicant,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: admissionKeys.all })
      toast.success("تمت أرشفة المتقدم")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
