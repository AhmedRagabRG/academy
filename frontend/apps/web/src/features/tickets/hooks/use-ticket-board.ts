"use client"
import { useQuery } from "@tanstack/react-query"
import { ticketService } from "../services/active-ticket-service"
import { ticketKeys } from "../services/ticket-query-keys"
import type { TicketFilters, TicketSort } from "../types/commands"
import { actorFingerprint, useTicketActor } from "./use-ticket-actor"

export function useTicketBoard(search: string, filters: TicketFilters, sort: TicketSort, mode: "active" | "archived" = "active") {
  const actor = useTicketActor(), scope = actorFingerprint(actor)
  const list = useQuery({ queryKey: ticketKeys.list(scope, { search, filters, sort, mode }), queryFn: ({ signal }) => ticketService.listTickets({ actor, search, filters, sort, mode, pageSize: 100 }, signal) })
  const dashboard = useQuery({ queryKey: ticketKeys.dashboard(scope), queryFn: ({ signal }) => ticketService.getDashboard(actor, signal), enabled: mode === "active" })
  const configuration = useQuery({ queryKey: ticketKeys.configuration(), queryFn: ({ signal }) => ticketService.getConfiguration(signal) })
  return { actor, scope, list, dashboard, configuration }
}
