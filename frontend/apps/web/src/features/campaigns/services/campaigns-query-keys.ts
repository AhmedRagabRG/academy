import type { CampaignsListQuery, RecipientsQuery } from "./campaigns-service"

/** The cursor is left out of the key: pages of one filter share a cache entry. */
export const campaignsKeys = {
  all: ["campaigns"] as const,
  lists: () => ["campaigns", "list"] as const,
  list: (query: CampaignsListQuery) =>
    ["campaigns", "list", query.search, query.status, query.limit] as const,
  detail: (id: string) => ["campaigns", "detail", id] as const,
  preview: (id: string) => ["campaigns", "preview", id] as const,
  recipients: (id: string, query: RecipientsQuery) =>
    [
      "campaigns",
      "recipients",
      id,
      query.search,
      query.status,
      query.limit,
    ] as const,
  lookups: ["campaigns", "lookups"] as const,
  audience: (groupIds: string[]) =>
    ["campaigns", "audience", [...groupIds].sort().join(",")] as const,
}
