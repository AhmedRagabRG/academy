import type { InboxListQuery } from "../types/commands"
export const inboxKeys = {
  all: ["inbox"] as const,
  lists: () => ["inbox", "list"] as const,
  list: (query: InboxListQuery) => ["inbox", "list", query] as const,
  detail: (id: string | null) => ["inbox", "detail", id] as const,
  dashboard: (query: InboxListQuery) =>
    ["inbox", "dashboard", query.view] as const,
  lookups: ["inbox", "lookups"] as const,
}
