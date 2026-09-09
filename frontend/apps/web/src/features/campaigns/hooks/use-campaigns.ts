"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { campaignsService } from "../services/active-campaigns-service"
import { campaignsKeys } from "../services/campaigns-query-keys"
import type {
  CampaignsListQuery,
  RecipientsQuery,
} from "../services/campaigns-service"
import type { CampaignDraft } from "../types/domain"

export function useCampaignList(query: Omit<CampaignsListQuery, "cursor">) {
  return useInfiniteQuery({
    queryKey: campaignsKeys.list(query),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      campaignsService.list({ ...query, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor,
  })
}

export function useCampaignLookups() {
  return useQuery({
    queryKey: campaignsKeys.lookups,
    queryFn: ({ signal }) => campaignsService.lookups(signal),
    staleTime: 60_000,
  })
}

export function useCampaignDetail(id: string, enabled = true, poll = true) {
  return useQuery({
    queryKey: campaignsKeys.detail(id),
    queryFn: ({ signal }) => campaignsService.detail(id, signal),
    enabled,
    refetchInterval: poll ? 5_000 : false,
  })
}

export function useCampaignPreview(id: string, enabled = true) {
  return useQuery({
    queryKey: campaignsKeys.preview(id),
    queryFn: ({ signal }) => campaignsService.preview(id, signal),
    enabled,
  })
}

export function useCampaignRecipients(
  id: string,
  query: Omit<RecipientsQuery, "cursor">
) {
  return useInfiniteQuery({
    queryKey: campaignsKeys.recipients(id, query),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      campaignsService.recipients(id, { ...query, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor,
  })
}

export function useCampaignMutations() {
  const client = useQueryClient()
  const refresh = async (id?: string) => {
    await client.invalidateQueries({ queryKey: campaignsKeys.lists() })
    if (id)
      await Promise.all([
        client.invalidateQueries({ queryKey: campaignsKeys.detail(id) }),
        client.invalidateQueries({ queryKey: campaignsKeys.preview(id) }),
      ])
  }
  return {
    create: useMutation({
      mutationFn: (draft: CampaignDraft) => campaignsService.create(draft),
      onSuccess: (campaign) => refresh(campaign.id),
    }),
    update: useMutation({
      mutationFn: ({
        id,
        draft,
        expectedVersion,
      }: {
        id: string
        draft: CampaignDraft
        expectedVersion: number
      }) => campaignsService.update(id, draft, expectedVersion),
      onSuccess: (campaign) => refresh(campaign.id),
    }),
    remove: useMutation({
      mutationFn: (id: string) => campaignsService.remove(id),
      onSuccess: (_result, id) => refresh(id),
    }),
    launch: useMutation({
      mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt?: string }) =>
        campaignsService.launch(id, scheduledAt),
      onSuccess: (campaign) => refresh(campaign.id),
    }),
    pause: useMutation({
      mutationFn: (id: string) => campaignsService.pause(id),
      onSuccess: (campaign) => refresh(campaign.id),
    }),
    resume: useMutation({
      mutationFn: (id: string) => campaignsService.resume(id),
      onSuccess: (campaign) => refresh(campaign.id),
    }),
    cancel: useMutation({
      mutationFn: (id: string) => campaignsService.cancel(id),
      onSuccess: (campaign) => refresh(campaign.id),
    }),
    syncTemplates: useMutation({
      mutationFn: () => campaignsService.syncTemplates(),
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey: campaignsKeys.lookups })
      },
    }),
    importAudience: useMutation({
      mutationFn: ({
        name,
        rows,
      }: Parameters<typeof campaignsService.importAudience> extends [
        infer A,
        infer B,
      ]
        ? { name: A; rows: B }
        : never) => campaignsService.importAudience(name, rows),
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey: campaignsKeys.lookups })
      },
    }),
  }
}
