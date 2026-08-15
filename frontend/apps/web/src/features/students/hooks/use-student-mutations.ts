"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { UpdateProfileCommand } from "../types/commands"
import type { StudentsError } from "../services/students-error"
import { studentsService } from "../services/active-students-service"
import {
  invalidationTargets,
  studentKeys,
} from "../services/students-query-keys"
import { studentsCopy } from "../config/students-copy"
import { useStudentScopeFingerprint } from "./use-student-scope"

export interface ConflictState {
  currentVersion: number
}

/**
 * Profile update. On a version conflict the form keeps the employee's input and
 * surfaces a refresh prompt — it never auto-merges and never overwrites silently
 * (spec FR-037, FR-039).
 */
export function useUpdateStudentProfile(options?: {
  onConflict?: (state: ConflictState) => void
  onSuccess?: () => void
}) {
  const client = useQueryClient()
  const fingerprint = useStudentScopeFingerprint()

  return useMutation({
    mutationFn: (command: UpdateProfileCommand) =>
      studentsService.updateProfile(command),
    onSuccess: async (detail) => {
      await Promise.all(
        invalidationTargets("update-profile", fingerprint, detail.id).map(
          (queryKey) => client.invalidateQueries({ queryKey })
        )
      )
      await client.invalidateQueries({
        queryKey: studentKeys.lists(fingerprint),
      })
      toast.success("تم حفظ بيانات الطالب")
      options?.onSuccess?.()
    },
    onError: (error: StudentsError) => {
      if (error.code === "version-conflict") {
        options?.onConflict?.({
          currentVersion: error.details.currentVersion ?? 0,
        })
        toast.error(studentsCopy.conflict)
        return
      }
      toast.error(error.message)
    },
  })
}
