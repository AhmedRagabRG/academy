"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import type { StudentId } from "../types/common"
import { studentsService } from "../services/active-students-service"
import { studentKeys } from "../services/students-query-keys"
import { useStudentScopeFingerprint } from "./use-student-scope"

const PAGE_SIZE = 20

/**
 * Keyset paging over `(occurredAt, sequence)`. Ordering stays stable while new
 * events are appended, which offset paging cannot guarantee (spec FR-024).
 */
export function useStudentTimeline(studentId: StudentId, enabled = true) {
  const fingerprint = useStudentScopeFingerprint()
  return useInfiniteQuery({
    queryKey: studentKeys.timeline(fingerprint, studentId, {
      limit: PAGE_SIZE,
    }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      studentsService.listTimeline(
        studentId,
        { cursor: pageParam, limit: PAGE_SIZE },
        signal
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
  })
}
