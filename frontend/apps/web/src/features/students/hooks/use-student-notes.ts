"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { StudentId } from "../types/common"
import type {
  AddNoteCommand,
  ArchiveNoteCommand,
  EditNoteCommand,
} from "../types/commands"
import type { StudentsError } from "../services/students-error"
import { studentsService } from "../services/active-students-service"
import { studentKeys } from "../services/students-query-keys"
import { useStudentScopeFingerprint } from "./use-student-scope"

export function useStudentNotes(studentId: StudentId, enabled = true) {
  const fingerprint = useStudentScopeFingerprint()
  return useQuery({
    queryKey: studentKeys.notes(fingerprint, studentId),
    queryFn: ({ signal }) => studentsService.listNotes(studentId, signal),
    enabled,
  })
}

/** Notes invalidate only their own key — nothing else depends on them. */
function useNotesInvalidation(studentId: StudentId) {
  const client = useQueryClient()
  const fingerprint = useStudentScopeFingerprint()
  return () =>
    client.invalidateQueries({
      queryKey: studentKeys.notes(fingerprint, studentId),
    })
}

export function useAddStudentNote(studentId: StudentId) {
  const invalidate = useNotesInvalidation(studentId)
  return useMutation({
    mutationFn: (command: AddNoteCommand) => studentsService.addNote(command),
    onSuccess: async () => {
      await invalidate()
      toast.success("تمت إضافة الملاحظة")
    },
    onError: (error: StudentsError) => toast.error(error.message),
  })
}

export function useEditStudentNote(studentId: StudentId) {
  const invalidate = useNotesInvalidation(studentId)
  return useMutation({
    mutationFn: (command: EditNoteCommand) => studentsService.editNote(command),
    onSuccess: async () => {
      await invalidate()
      toast.success("تم تعديل الملاحظة")
    },
    onError: (error: StudentsError) => toast.error(error.message),
  })
}

export function useArchiveStudentNote(studentId: StudentId) {
  const invalidate = useNotesInvalidation(studentId)
  return useMutation({
    mutationFn: (command: ArchiveNoteCommand) =>
      studentsService.archiveNote(command),
    onSuccess: async () => {
      await invalidate()
      toast.success("تمت أرشفة الملاحظة")
    },
    onError: (error: StudentsError) => toast.error(error.message),
  })
}
