import type { StudentDocumentId, StudentId } from "../types/common"
import type { StudentListQuery, StudentTimelineQuery } from "../types/commands"
import { serializeStudentListQuery } from "../utils/student-list-query"

const ROOT = "students" as const

/**
 * Every key carries the scope fingerprint, so one employee's scoped results are
 * never served to another context from cache. Each workspace area has its own key
 * so areas load and invalidate independently.
 */
export const studentKeys = {
  all: [ROOT] as const,
  scope: (fingerprint: string) => [ROOT, fingerprint] as const,
  lists: (fingerprint: string) => [ROOT, fingerprint, "list"] as const,
  list: (fingerprint: string, query: StudentListQuery) =>
    [ROOT, fingerprint, "list", serializeStudentListQuery(query)] as const,
  detail: (fingerprint: string, studentId: StudentId) =>
    [ROOT, fingerprint, "detail", studentId] as const,
  enrollments: (fingerprint: string, studentId: StudentId) =>
    [ROOT, fingerprint, "enrollments", studentId] as const,
  documents: (fingerprint: string, studentId: StudentId) =>
    [ROOT, fingerprint, "documents", studentId] as const,
  documentHistory: (
    fingerprint: string,
    studentId: StudentId,
    documentId: StudentDocumentId
  ) =>
    [ROOT, fingerprint, "document-history", studentId, documentId] as const,
  notes: (fingerprint: string, studentId: StudentId) =>
    [ROOT, fingerprint, "notes", studentId] as const,
  timeline: (
    fingerprint: string,
    studentId: StudentId,
    query: Omit<StudentTimelineQuery, "cursor">
  ) =>
    [
      ROOT,
      fingerprint,
      "timeline",
      studentId,
      JSON.stringify([query.limit, query.categories ?? []]),
    ] as const,
  statusHistory: (fingerprint: string, studentId: StudentId) =>
    [ROOT, fingerprint, "status-history", studentId] as const,
  finance: (fingerprint: string, studentId: StudentId) =>
    [ROOT, fingerprint, "finance", studentId] as const,
  contextSummary: (fingerprint: string, studentId: StudentId) =>
    [ROOT, fingerprint, "context-summary", studentId] as const,
  lookups: (fingerprint: string) => [ROOT, fingerprint, "lookups"] as const,
}

export type StudentMutationKind =
  | "update-profile"
  | "change-status"
  | "document"
  | "note"

/**
 * What each command invalidates. Nothing in this module invalidates `finance` or
 * `lookups`: those are owned elsewhere.
 */
export function invalidationTargets(
  kind: StudentMutationKind,
  fingerprint: string,
  studentId: StudentId
): readonly (readonly unknown[])[] {
  switch (kind) {
    case "update-profile":
      return [
        studentKeys.detail(fingerprint, studentId),
        studentKeys.lists(fingerprint),
        studentKeys.timeline(fingerprint, studentId, { limit: 20 }),
      ]
    case "change-status":
      return [
        studentKeys.detail(fingerprint, studentId),
        studentKeys.lists(fingerprint),
        studentKeys.statusHistory(fingerprint, studentId),
        studentKeys.timeline(fingerprint, studentId, { limit: 20 }),
      ]
    case "document":
      return [
        studentKeys.documents(fingerprint, studentId),
        studentKeys.detail(fingerprint, studentId),
        studentKeys.timeline(fingerprint, studentId, { limit: 20 }),
      ]
    case "note":
      return [studentKeys.notes(fingerprint, studentId)]
  }
}
