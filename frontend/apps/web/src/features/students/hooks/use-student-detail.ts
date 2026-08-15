"use client"

import { useQuery } from "@tanstack/react-query"
import type { StudentId } from "../types/common"
import { studentsService } from "../services/active-students-service"
import { studentKeys } from "../services/students-query-keys"
import { useStudentScopeFingerprint } from "./use-student-scope"

/**
 * One hook per workspace area, each with its own query key, so an area can load,
 * fail, and retry without disturbing the others (spec US3-5).
 */

export function useStudentDetail(studentId: StudentId) {
  const fingerprint = useStudentScopeFingerprint()
  return useQuery({
    queryKey: studentKeys.detail(fingerprint, studentId),
    queryFn: ({ signal }) => studentsService.get(studentId, signal),
  })
}

export function useStudentEnrollments(studentId: StudentId, enabled = true) {
  const fingerprint = useStudentScopeFingerprint()
  return useQuery({
    queryKey: studentKeys.enrollments(fingerprint, studentId),
    queryFn: ({ signal }) => studentsService.listEnrollments(studentId, signal),
    enabled,
  })
}

export function useStudentFinancialSummary(
  studentId: StudentId,
  enabled = true
) {
  const fingerprint = useStudentScopeFingerprint()
  return useQuery({
    queryKey: studentKeys.finance(fingerprint, studentId),
    queryFn: ({ signal }) =>
      studentsService.getFinancialSummary(studentId, signal),
    enabled,
  })
}

export function useStudentStatusHistory(studentId: StudentId) {
  const fingerprint = useStudentScopeFingerprint()
  return useQuery({
    queryKey: studentKeys.statusHistory(fingerprint, studentId),
    queryFn: ({ signal }) =>
      studentsService.listStatusHistory(studentId, signal),
  })
}
