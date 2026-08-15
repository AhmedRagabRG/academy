"use client"

import { useQuery } from "@tanstack/react-query"
import { accountingService } from "../services/active-accounting-service"
import { accountingKeys } from "../services/accounting-query-keys"
import { useAccountingScopeFingerprint } from "./use-accounting-scope"

/** Branches, active categories and sub-categories, and the configured policies. */
export function useAccountingLookups() {
  const fingerprint = useAccountingScopeFingerprint()
  return useQuery({
    queryKey: accountingKeys.lookups(fingerprint),
    queryFn: ({ signal }) => accountingService.lookups(signal),
    staleTime: 60_000,
  })
}
