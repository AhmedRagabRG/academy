"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdmissionId } from "../types/common"
import { admissionsService } from "../services/active-admissions-service"
import { admissionKeys } from "../services/admissions-query-keys"

export function useAdmissionDocuments(id: AdmissionId) {
  return useQuery({
    queryKey: admissionKeys.documents(id),
    queryFn: ({ signal }) => admissionsService.documents(id, signal),
  })
}

export function useAdmissionDocumentHistory(
  admissionId: AdmissionId,
  documentId: Parameters<typeof admissionsService.documentHistory>[1]
) {
  return useQuery({
    queryKey: [...admissionKeys.documents(admissionId), documentId, "history"],
    queryFn: ({ signal }) =>
      admissionsService.documentHistory(admissionId, documentId, signal),
  })
}

function useDocumentMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: admissionKeys.all })
      toast.success("تم تحديث المستند")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export const useUploadAdmissionDocument = () =>
  useDocumentMutation(admissionsService.uploadDocument)
export const useReplaceAdmissionDocument = () =>
  useDocumentMutation(admissionsService.replaceDocument)
export const useWithdrawAdmissionDocument = () =>
  useDocumentMutation(admissionsService.withdrawDocument)
export const useVerifyAdmissionDocument = () =>
  useDocumentMutation(admissionsService.verifyDocument)
export const useRefreshAdmissionDocumentPolicy = () =>
  useDocumentMutation((admissionId: AdmissionId) =>
    admissionsService.refreshDocumentPolicy(admissionId)
  )
