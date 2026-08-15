"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  AdmissionListQuery,
  TransitionAdmissionCommand,
} from "../types/commands"
import { admissionsService } from "../services/active-admissions-service"
import { admissionKeys } from "../services/admissions-query-keys"

export function useAdmissionsList(query: AdmissionListQuery) {
  return useQuery({
    queryKey: admissionKeys.list(query),
    queryFn: ({ signal }) => admissionsService.list(query, signal),
  })
}

export function useAdmissionLookups() {
  return useQuery({
    queryKey: admissionKeys.lookups(),
    queryFn: ({ signal }) => admissionsService.lookups(signal),
    staleTime: 60_000,
  })
}

export function useAdmissionBulkTransition() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (commands: TransitionAdmissionCommand[]) =>
      admissionsService.bulkTransition({ items: commands }),
    onSuccess: async (outcomes) => {
      const success = outcomes.filter((item) => item.success).length
      const failed = outcomes.length - success
      await client.invalidateQueries({ queryKey: admissionKeys.lists() })
      if (failed) toast.warning(`تم تنفيذ ${success} وتعذر تنفيذ ${failed}`)
      else toast.success(`تم تنفيذ الإجراء على ${success} سجل`)
    },
    onError: () => toast.error("تعذر تنفيذ الإجراء الجماعي"),
  })
}

export function useAdmissionsExport() {
  return useMutation({
    mutationFn: (query: AdmissionListQuery) =>
      admissionsService.exportList(query),
    onSuccess: (csv) => {
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" })
      )
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "admissions.csv"
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("تم تجهيز ملف التصدير")
    },
    onError: () => toast.error("تعذر تصدير طلبات القبول"),
  })
}
