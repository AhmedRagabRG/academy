"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { channelsService } from "../services/active-channels-service"
import { channelKeys } from "../services/channels-query-keys"
import type { ConnectChannelCommand } from "../types/domain"

export function useChannels() {
  const client = useQueryClient()
  const refresh = () =>
    client.invalidateQueries({ queryKey: channelKeys.overview })

  const overview = useQuery({
    queryKey: channelKeys.overview,
    queryFn: ({ signal }) => channelsService.overview(signal),
  })

  return {
    overview,
    exchange: useMutation({
      mutationFn: (input: { userAccessToken?: string; wabaId?: string }) =>
        channelsService.exchange(input),
    }),
    connect: useMutation({
      mutationFn: (command: ConnectChannelCommand) =>
        channelsService.connect(command),
      onSuccess: refresh,
    }),
    verify: useMutation({
      mutationFn: (id: string) => channelsService.verify(id),
      onSuccess: refresh,
    }),
    disconnect: useMutation({
      mutationFn: (id: string) => channelsService.disconnect(id),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => channelsService.remove(id),
      onSuccess: refresh,
    }),
  }
}
