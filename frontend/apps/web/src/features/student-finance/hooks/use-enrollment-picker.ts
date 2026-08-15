"use client"

import { useQuery } from "@tanstack/react-query"
import { financeDependencyReaders } from "../services/finance-dependency-adapters"
import { financeKeys } from "../services/finance-query-keys"

/**
 * The student and enrollment reads behind the invoice picker.
 *
 * Both come from this module's existing dependency readers rather than a new
 * cross-module import: Student Finance already declares how it reaches Student
 * Management, and raising an invoice needs exactly the two reads that port
 * publishes.
 */
export function useStudentSearch(term: string) {
  const trimmed = term.trim()
  return useQuery({
    queryKey: [...financeKeys.all, "student-search", trimmed] as const,
    // A single character matches most of the register, so the search waits for
    // enough to narrow on rather than pulling the first page of everyone.
    enabled: trimmed.length >= 2,
    queryFn: ({ signal }) =>
      financeDependencyReaders.students.searchStudents(trimmed, signal),
  })
}

export function useStudentEnrollments(studentId: string | undefined) {
  return useQuery({
    queryKey: [...financeKeys.all, "student-enrollments", studentId] as const,
    enabled: Boolean(studentId),
    queryFn: ({ signal }) =>
      financeDependencyReaders.students.listEnrollments(studentId!, signal),
  })
}
