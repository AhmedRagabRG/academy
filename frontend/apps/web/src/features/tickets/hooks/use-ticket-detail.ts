"use client"
import { useQuery } from "@tanstack/react-query"
import { ticketService } from "../services/active-ticket-service"
import { ticketKeys } from "../services/ticket-query-keys"
import type { TicketId } from "../types/common"
import { actorFingerprint, useTicketActor } from "./use-ticket-actor"

export function useTicketDetail(ticketId: TicketId) {
  const actor = useTicketActor(), scope = actorFingerprint(actor)
  const detail = useQuery({ queryKey: ticketKeys.detail(scope, ticketId), queryFn: ({ signal }) => ticketService.getTicket(ticketId, actor, signal) })
  const configuration = useQuery({ queryKey: ticketKeys.configuration(), queryFn: ({ signal }) => ticketService.getConfiguration(signal) })
  return { actor, scope, detail, configuration }
}
