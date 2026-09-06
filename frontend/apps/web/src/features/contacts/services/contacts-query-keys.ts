import type { ContactsListQuery } from "./contacts-service"

/** The query key omits the cursor: pages of one filter share a cache entry. */
export const contactsKeys = {
  all: ["contacts"] as const,
  lists: () => ["contacts", "list"] as const,
  list: (query: ContactsListQuery) =>
    [
      "contacts",
      "list",
      query.search,
      query.source,
      [...query.groupIds].sort().join(","),
      query.limit,
    ] as const,
  lookups: ["contacts", "lookups"] as const,
}
