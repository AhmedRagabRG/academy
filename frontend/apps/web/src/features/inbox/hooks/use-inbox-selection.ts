"use client"
import { useEffect } from "react"
import type { ConversationView } from "../types/projections"
import { useInboxWorkspaceStore } from "../stores/inbox-workspace-store"
export function useInboxSelection(rows: ConversationView[]) {
  const selectedId = useInboxWorkspaceStore((state) => state.selectedId)
  const select = useInboxWorkspaceStore((state) => state.select)
  useEffect(() => {
    if (selectedId && !rows.some((row) => row.id === selectedId)) select(null)
  }, [rows, select, selectedId])
}
