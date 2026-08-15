"use client"

import { useQuery } from "@tanstack/react-query"
import type { DashboardQuery } from "../types/commands"
import { accountingService } from "../services/active-accounting-service"
import { accountingKeys } from "../services/accounting-query-keys"
import { useAccountingScopeFingerprint } from "./use-accounting-scope"

export function useAccountingDashboard(query: DashboardQuery = {}) {
  const fingerprint = useAccountingScopeFingerprint()
  return useQuery({
    queryKey: accountingKeys.dashboard(fingerprint, query),
    queryFn: ({ signal }) => accountingService.getDashboard(query, signal),
  })
}
