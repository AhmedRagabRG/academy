"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { authService } from "../services/auth-service"
import { queryKeys } from "@/shared/services/query-keys"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"

export function useSession() {
  const query = useQuery({ queryKey: queryKeys.session, queryFn: authService.getSession })
  const setContext = useEmployeeContextStore((state) => state.setContext)
  useEffect(() => { if (query.isSuccess) setContext(query.data) }, [query.data, query.isSuccess, setContext])
  return query
}
