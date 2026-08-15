"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { StudentListQuery } from "../types/commands"
import type { BulkStatusOutcome } from "../types/projections"
import type { BulkChangeStatusCommand } from "../types/commands"
import { studentsService } from "../services/active-students-service"
import { studentKeys } from "../services/students-query-keys"
import { listCopy } from "../config/students-copy"
import { useStudentScopeFingerprint } from "./use-student-scope"

export function useStudentsList(query: StudentListQuery) {
  const fingerprint = useStudentScopeFingerprint()
  return useQuery({
    queryKey: studentKeys.list(fingerprint, query),
    queryFn: ({ signal }) => studentsService.list(query, signal),
    placeholderData: (previous) => previous,
  })
}

export function useStudentLookups() {
  const fingerprint = useStudentScopeFingerprint()
  return useQuery({
    queryKey: studentKeys.lookups(fingerprint),
    queryFn: ({ signal }) => studentsService.lookups(signal),
    staleTime: 60_000,
  })
}

export function useStudentsExport() {
  return useMutation({
    mutationFn: (query: StudentListQuery) => studentsService.exportList(query),
    onSuccess: (csv) => {
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" })
      )
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "students.csv"
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("تم تجهيز ملف التصدير")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

/**
 * Bulk status changes report per-record outcomes; partial failure is never
 * collapsed into a single success or failure (spec FR-035).
 */
export function useStudentBulkStatus(
  onOutcome?: (outcomes: BulkStatusOutcome[]) => void
) {
  const client = useQueryClient()
  const fingerprint = useStudentScopeFingerprint()
  return useMutation({
    mutationFn: (command: BulkChangeStatusCommand) =>
      studentsService.bulkChangeStatus(command),
    onSuccess: async (outcomes) => {
      const applied = outcomes.filter(
        (outcome) => outcome.outcome === "applied"
      ).length
      const refused = outcomes.length - applied
      await client.invalidateQueries({
        queryKey: studentKeys.lists(fingerprint),
      })
      onOutcome?.(outcomes)
      if (refused)
        toast.warning(
          `${listCopy.bulkApplied}: ${applied} · ${listCopy.bulkRefused}: ${refused}`
        )
      else toast.success(`${listCopy.bulkApplied}: ${applied}`)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
