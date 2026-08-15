"use client"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { inboxService } from "../services/active-inbox-service"
import { inboxKeys } from "../services/inbox-query-keys"
import { useInboxWorkspaceStore } from "../stores/inbox-workspace-store"

export function useInboxList() {
  const query = useInboxWorkspaceStore((state) => state.query)
  return useInfiniteQuery({
    queryKey: inboxKeys.list(query),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      inboxService.list({ ...query, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor,
  })
}
export function useInboxDashboard() {
  const query = useInboxWorkspaceStore((state) => state.query)
  return useQuery({
    queryKey: inboxKeys.dashboard(query),
    queryFn: ({ signal }) => inboxService.dashboard(query, signal),
  })
}
export function useInboxLookups() {
  return useQuery({
    queryKey: inboxKeys.lookups,
    queryFn: ({ signal }) => inboxService.lookups(signal),
    staleTime: Infinity,
  })
}
