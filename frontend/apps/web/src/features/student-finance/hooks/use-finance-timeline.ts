"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import type { FinanceEventCategory } from "../types/common"
import { studentFinanceService } from "../services/active-student-finance-service"
import { financeKeys } from "../services/finance-query-keys"
import { useFinanceScopeFingerprint } from "./use-finance-scope"

const PAGE_SIZE = 20

/**
 * The student's financial timeline, paged by keyset cursor.
 *
 * Cursor paging rather than offset paging: an event appended while the reader is
 * part-way down the list would shift every offset, repeating one row and skipping
 * another. The cursor is a position in the ordering, so it stays correct
 * (research R9, spec FR-035).
 */
export function useFinanceTimeline(
  studentId: string,
  categories?: readonly FinanceEventCategory[]
) {
  const fingerprint = useFinanceScopeFingerprint()

  return useInfiniteQuery({
    queryKey: financeKeys.timeline(fingerprint, studentId, {
      limit: PAGE_SIZE,
      categories: categories?.length ? [...categories] : undefined,
    }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      studentFinanceService.listTimeline(
        studentId,
        {
          limit: PAGE_SIZE,
          cursor: pageParam,
          categories: categories?.length ? [...categories] : undefined,
        },
        signal
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(studentId),
  })
}
