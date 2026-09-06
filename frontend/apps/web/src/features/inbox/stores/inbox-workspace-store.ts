"use client"
import { create } from "zustand"
import type { ConversationId, SavedViewKey, SortMode } from "../types/common"
import type { InboxListQuery } from "../types/commands"

export const defaultInboxQuery: InboxListQuery = {
  search: "",
  view: "all",
  platforms: [],
  statuses: [],
  employeeIds: [],
  teamIds: [],
  tagIds: [],
  unreadOnly: false,
  sort: "latest",
  limit: 30,
}
interface WorkspaceState {
  selectedId: ConversationId | null
  query: InboxListQuery
  recentSearches: string[]
  mobilePane: "list" | "conversation" | "details"
  drafts: Record<string, string>
  select: (id: ConversationId | null) => void
  patchQuery: (patch: Partial<InboxListQuery>) => void
  setView: (view: SavedViewKey) => void
  setSort: (sort: SortMode) => void
  rememberSearch: (value: string) => void
  setMobilePane: (pane: WorkspaceState["mobilePane"]) => void
  setDraft: (id: string, value: string) => void
  reset: () => void
}
export const useInboxWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedId: null,
  query: defaultInboxQuery,
  recentSearches: [],
  mobilePane: "list",
  drafts: {},
  select: (selectedId) =>
    set({ selectedId, mobilePane: selectedId ? "conversation" : "list" }),
  patchQuery: (patch) =>
    set((state) => ({ query: { ...state.query, ...patch, cursor: null } })),
  setView: (view) =>
    set((state) => ({ query: { ...state.query, view, cursor: null } })),
  setSort: (sort) =>
    set((state) => ({ query: { ...state.query, sort, cursor: null } })),
  rememberSearch: (value) =>
    set((state) => ({
      recentSearches: value.trim()
        ? [
            value.trim(),
            ...state.recentSearches.filter((item) => item !== value.trim()),
          ].slice(0, 5)
        : state.recentSearches,
    })),
  setMobilePane: (mobilePane) => set({ mobilePane }),
  setDraft: (id, value) =>
    set((state) => ({ drafts: { ...state.drafts, [id]: value } })),
  reset: () =>
    set({
      selectedId: null,
      query: defaultInboxQuery,
      recentSearches: [],
      mobilePane: "list",
      drafts: {},
    }),
}))
