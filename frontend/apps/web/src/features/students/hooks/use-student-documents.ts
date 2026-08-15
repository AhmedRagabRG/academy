"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { StudentDocumentId, StudentId } from "../types/common"
import type {
  ArchiveDocumentCommand,
  ReplaceDocumentCommand,
  UploadDocumentCommand,
} from "../types/commands"
import type { StudentsError } from "../services/students-error"
import { studentsService } from "../services/active-students-service"
import {
  invalidationTargets,
  studentKeys,
} from "../services/students-query-keys"
import { useStudentScopeFingerprint } from "./use-student-scope"

export function useStudentDocuments(studentId: StudentId, enabled = true) {
  const fingerprint = useStudentScopeFingerprint()
  return useQuery({
    queryKey: studentKeys.documents(fingerprint, studentId),
    queryFn: ({ signal }) => studentsService.listDocuments(studentId, signal),
    enabled,
  })
}

export function useStudentDocumentHistory(
  studentId: StudentId,
  documentId?: StudentDocumentId
) {
  const fingerprint = useStudentScopeFingerprint()
  return useQuery({
    queryKey: studentKeys.documentHistory(
      fingerprint,
      studentId,
      documentId ?? ("" as StudentDocumentId)
    ),
    queryFn: ({ signal }) =>
      studentsService.documentHistory(studentId, documentId!, signal),
    enabled: Boolean(documentId),
  })
}

function useDocumentInvalidation(studentId: StudentId) {
  const client = useQueryClient()
  const fingerprint = useStudentScopeFingerprint()
  return async () => {
    await Promise.all(
      invalidationTargets("document", fingerprint, studentId).map((queryKey) =>
        client.invalidateQueries({ queryKey })
      )
    )
  }
}

export function useUploadStudentDocument(studentId: StudentId) {
  const invalidate = useDocumentInvalidation(studentId)
  return useMutation({
    mutationFn: (command: UploadDocumentCommand) =>
      studentsService.uploadDocument(command),
    onSuccess: async () => {
      await invalidate()
      toast.success("تم رفع المستند")
    },
    onError: (error: StudentsError) => toast.error(error.message),
  })
}

export function useReplaceStudentDocument(studentId: StudentId) {
  const invalidate = useDocumentInvalidation(studentId)
  return useMutation({
    mutationFn: (command: ReplaceDocumentCommand) =>
      studentsService.replaceDocument(command),
    onSuccess: async () => {
      await invalidate()
      toast.success("تم استبدال المستند مع الاحتفاظ بالنسخة السابقة")
    },
    onError: (error: StudentsError) => toast.error(error.message),
  })
}

export function useArchiveStudentDocument(studentId: StudentId) {
  const invalidate = useDocumentInvalidation(studentId)
  return useMutation({
    mutationFn: (command: ArchiveDocumentCommand) =>
      studentsService.archiveDocument(command),
    onSuccess: async () => {
      await invalidate()
      toast.success("تمت أرشفة المستند مع الاحتفاظ به للسجل التاريخي")
    },
    onError: (error: StudentsError) => toast.error(error.message),
  })
}
