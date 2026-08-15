"use client"

import { useQuery } from "@tanstack/react-query"
import type { ExpenseRequestListQuery } from "../types/commands"
import { accountingService } from "../services/active-accounting-service"
import { accountingKeys } from "../services/accounting-query-keys"
import { useAccountingScopeFingerprint } from "./use-accounting-scope"

export function useExpenseRequests(query: ExpenseRequestListQuery) {
  const fingerprint = useAccountingScopeFingerprint()
  return useQuery({
    queryKey: accountingKeys.requests(fingerprint, query),
    queryFn: ({ signal }) => accountingService.listRequests(query, signal),
    // Keeps the previous page visible while the next loads, so filtering does not
    // flash an empty table.
    placeholderData: (previous) => previous,
  })
}
