"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ChangeStatusCommand } from "../types/commands"
import { studentsService } from "../services/active-students-service"
import {
  invalidationTargets,
  studentKeys,
} from "../services/students-query-keys"
import { useStudentScopeFingerprint } from "./use-student-scope"

export function useStudentStatusChange(onConflict?: (current: number) => void) {
  const client = useQueryClient()
  const fingerprint = useStudentScopeFingerprint()

  return useMutation({
    mutationFn: (command: ChangeStatusCommand) =>
      studentsService.changeStatus(command),
    onSuccess: async (detail) => {
      await Promise.all(
        invalidationTargets("change-status", fingerprint, detail.id).map(
          (queryKey) => client.invalidateQueries({ queryKey })
        )
      )
      await client.invalidateQueries({
        queryKey: studentKeys.lists(fingerprint),
      })
      toast.success("تم تحديث حالة الطالب")
    },
    onError: (error: Error & { code?: string; details?: { currentVersion?: number } }) => {
      if (error.code === "version-conflict" && error.details?.currentVersion)
        onConflict?.(error.details.currentVersion)
      toast.error(error.message)
    },
  })
}
