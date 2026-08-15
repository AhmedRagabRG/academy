import type { TicketListQuery } from "../types/commands"

export const ticketKeys = {
  all: ["tickets"] as const,
  configuration: () => ["tickets", "configuration"] as const,
  list: (scope: string, query: TicketListQuery) => ["tickets", scope, "list", query] as const,
  detail: (scope: string, id: string) => ["tickets", scope, "detail", id] as const,
  dashboard: (scope: string) => ["tickets", scope, "dashboard"] as const,
}
