"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { authService } from "../services/auth-service"
import { queryKeys } from "@/shared/services/query-keys"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"

export function useSignIn() {
  const client = useQueryClient()
  const setContext = useEmployeeContextStore((state) => state.setContext)
  return useMutation({
    mutationFn: authService.signIn,
    onSuccess: (context) => { setContext(context); client.setQueryData(queryKeys.session, context) },
  })
}

export function useSignOut() {
  const client = useQueryClient()
  const setContext = useEmployeeContextStore((state) => state.setContext)
  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => { setContext(null); client.setQueryData(queryKeys.session, null) },
  })
}
