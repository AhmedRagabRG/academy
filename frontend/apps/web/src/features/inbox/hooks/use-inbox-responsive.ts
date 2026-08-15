"use client"
import { useInboxWorkspaceStore } from "../stores/inbox-workspace-store"
export function useInboxResponsive() {
  return useInboxWorkspaceStore((state) => ({
    pane: state.mobilePane,
    setPane: state.setMobilePane,
  }))
}
