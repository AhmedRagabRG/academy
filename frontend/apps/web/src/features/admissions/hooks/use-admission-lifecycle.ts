"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdmissionId } from "../types/common"
import { admissionsService } from "../services/active-admissions-service"
import { admissionKeys } from "../services/admissions-query-keys"

export function useAdmissionReadiness(
  id: AdmissionId,
  version: number,
  action: "submit" | "approve"
) {
  return useQuery({
    queryKey: admissionKeys.readiness(id, version, action),
    queryFn: ({ signal }) => admissionsService.readiness(id, action, signal),
  })
}

export function useAdmissionLifecycle(id: AdmissionId) {
  return useQuery({
    queryKey: admissionKeys.lifecycle(id),
    queryFn: ({ signal }) => admissionsService.lifecycle(id, signal),
  })
}

export function useEnrollmentReadiness(id: AdmissionId) {
  return useQuery({
    queryKey: admissionKeys.enrollmentReadiness(id),
    queryFn: ({ signal }) => admissionsService.enrollmentReadiness(id, signal),
  })
}

export function useTransitionAdmission() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: admissionsService.transition,
    onSuccess: async (detail) => {
      client.setQueryData(admissionKeys.detail(detail.id), detail)
      await client.invalidateQueries({ queryKey: admissionKeys.all })
      toast.success("تم تحديث حالة طلب القبول")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
