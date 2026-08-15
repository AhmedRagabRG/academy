import { ticketPermissions } from "../config/ticket-permissions"
import type { Ticket } from "../types/domain"
import type { TicketActor } from "../types/commands"

export function canViewTicket(ticket: Ticket, actor: TicketActor) {
  if (actor.permissions.includes(ticketPermissions.viewAll)) return true
  if (actor.permissions.includes(ticketPermissions.viewTeam) && ticket.teamId && actor.teamIds.includes(ticket.teamId)) return true
  return actor.permissions.includes(ticketPermissions.viewAssigned) && ticket.employeeId === actor.employeeId
}

export function can(actor: TicketActor, permission: string) {
  return actor.permissions.includes(permission)
}
