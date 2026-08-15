import type { CursorPage, TicketId, TicketPriority, TicketStatus } from "../types/common"
import type { CreateTicketInput, TicketActor, TicketListQuery } from "../types/commands"
import type { TicketAttachment, TicketConfiguration } from "../types/domain"
import type { TicketDashboard, TicketDetail, TicketSummary } from "../types/projections"

export interface TicketService {
  getConfiguration(signal?: AbortSignal): Promise<TicketConfiguration>
  listTickets(query: TicketListQuery, signal?: AbortSignal): Promise<CursorPage<TicketSummary>>
  getTicket(ticketId: TicketId, actor: TicketActor, signal?: AbortSignal): Promise<TicketDetail>
  getDashboard(actor: TicketActor, signal?: AbortSignal): Promise<TicketDashboard>
  createTicket(input: CreateTicketInput, actor: TicketActor): Promise<TicketDetail>
  updateTicket(ticketId: TicketId, input: Partial<CreateTicketInput>, expectedVersion: number, actor: TicketActor): Promise<TicketDetail>
  changeStatus(ticketId: TicketId, status: Exclude<TicketStatus, "archived">, expectedVersion: number, actor: TicketActor): Promise<TicketDetail>
  changePriority(ticketId: TicketId, priority: TicketPriority, expectedVersion: number, actor: TicketActor): Promise<TicketDetail>
  changeAssignment(ticketId: TicketId, assignment: { teamId?: string; employeeId?: string }, expectedVersion: number, actor: TicketActor): Promise<TicketDetail>
  addComment(ticketId: TicketId, message: string, actor: TicketActor): Promise<TicketDetail>
  editComment(ticketId: TicketId, commentId: string, message: string, actor: TicketActor): Promise<TicketDetail>
  deleteComment(ticketId: TicketId, commentId: string, actor: TicketActor): Promise<TicketDetail>
  uploadAttachment(ticketId: TicketId, file: File, actor: TicketActor, signal?: AbortSignal): Promise<TicketAttachment>
  archiveTicket(ticketId: TicketId, expectedVersion: number, actor: TicketActor): Promise<TicketDetail>
  restoreTicket(ticketId: TicketId, expectedVersion: number, actor: TicketActor): Promise<TicketDetail>
  deleteTicket(ticketId: TicketId, actor: TicketActor): Promise<void>
  reset(): void
}
