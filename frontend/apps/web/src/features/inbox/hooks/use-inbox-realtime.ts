"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { API_BASE_URL } from "@/shared/api"
import { useMockServices } from "@/shared/config/service-mode"
import { inboxKeys } from "../services/inbox-query-keys"

export function useInboxRealtime(): void {
  const client = useQueryClient()

  useEffect(() => {
    if (useMockServices) return
    const source = new EventSource(`${API_BASE_URL}/inbox/events`, {
      withCredentials: true,
    })
    let timer: ReturnType<typeof setTimeout> | undefined
    source.onmessage = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void client.invalidateQueries({ queryKey: inboxKeys.all })
      }, 100)
    }
    return () => {
      clearTimeout(timer)
      source.close()
    }
  }, [client])
}
