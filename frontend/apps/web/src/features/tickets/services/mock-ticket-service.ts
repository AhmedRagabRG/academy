import { ticketConfiguration } from "../config/ticket-configuration"
import { ticketPermissions } from "../config/ticket-permissions"
import { createTicketSchema, commentSchema } from "../schemas/ticket-schemas"
import type { TicketService } from "./ticket-service"
import { TicketServiceError } from "./ticket-service-error"
import { ticketRepository } from "./mock-ticket-repository"
import { can, canViewTicket } from "../utils/ticket-scope"
import { filterAndSortTickets } from "../utils/ticket-list-query"
import type { Ticket, TicketActivity } from "../types/domain"
import type { TicketActor, TicketListQuery } from "../types/commands"
import type { ActivityId, AttachmentId, CommentId, TeamId, TicketId, UserId } from "../types/common"
import type { TicketCapabilities, TicketDetail, TicketSummary } from "../types/projections"

export { ticketFixtures } from "../data/ticket-fixtures"

const clone = <T>(value: T): T => structuredClone(value)
const fallbackActor: TicketActor = { userId: "employee-demo", name: "أحمد محمد", employeeId: "employee-demo", teamIds: ["team-support"], permissions: Object.values(ticketPermissions) }
export const defaultTicketActor = fallbackActor

function requirePermission(actor: TicketActor, permission: string) {
  if (!can(actor, permission)) throw new TicketServiceError("forbidden", "ليست لديك صلاحية لتنفيذ هذا الإجراء")
}
function findTicket(tickets: Ticket[], ticketId: TicketId, actor: TicketActor) {
  const ticket = tickets.find((item) => item.id === ticketId)
  if (!ticket || !canViewTicket(ticket, actor)) throw new TicketServiceError("not-found", "التذكرة غير متاحة")
  return ticket
}
function assertVersion(ticket: Ticket, version: number) {
  if (ticket.version !== version) throw new TicketServiceError("version-conflict", "تم تحديث التذكرة؛ أعد المحاولة")
}
function capabilities(actor: TicketActor): TicketCapabilities {
  return {
    edit: can(actor, ticketPermissions.edit), changeStatus: can(actor, ticketPermissions.changeStatus), changePriority: can(actor, ticketPermissions.changePriority),
    assignTeam: can(actor, ticketPermissions.assignTeam), assignEmployee: can(actor, ticketPermissions.assignEmployee), comment: can(actor, ticketPermissions.comment),
    attach: can(actor, ticketPermissions.attach), archive: can(actor, ticketPermissions.archive), restore: can(actor, ticketPermissions.restore), delete: can(actor, ticketPermissions.delete),
  }
}
function nameOf(kind: keyof typeof ticketConfiguration, id?: string) {
  if (!id) return undefined
  const collection = ticketConfiguration[kind]
  if (!Array.isArray(collection)) return undefined
  const found = (collection as { id?: string; name?: string }[]).find((item) => item.id === id)
  return found?.name
}
function toSummary(ticket: Ticket, actor: TicketActor, comments: { ticketId: TicketId }[]): TicketSummary {
  return { ...clone(ticket), teamName: nameOf("teams", ticket.teamId), employeeName: nameOf("employees", ticket.employeeId), customerName: nameOf("customers", ticket.customerId), studentName: nameOf("students", ticket.studentId), commentCount: comments.filter((item) => item.ticketId === ticket.id).length, capabilities: capabilities(actor) }
}
function toDetail(ticket: Ticket, actor: TicketActor, state: ReturnType<typeof ticketRepository.read>): TicketDetail {
  return { ...toSummary(ticket, actor, state.comments), conversationName: nameOf("conversations", ticket.conversationId), comments: state.comments.filter((item) => item.ticketId === ticket.id).sort((a,b) => a.createdAt.localeCompare(b.createdAt)), activity: state.activity.filter((item) => item.ticketId === ticket.id).sort((a,b) => a.occurredAt.localeCompare(b.occurredAt)), attachments: state.attachments.filter((item) => item.ticketId === ticket.id) }
}
function event(ticket: Ticket, actor: TicketActor, type: TicketActivity["type"], message: string): TicketActivity {
  return { id: crypto.randomUUID() as ActivityId, ticketId: ticket.id, type, actorId: actor.userId as UserId, actorName: actor.name, occurredAt: new Date().toISOString(), message }
}
function searchable(ticket: Ticket) { return [ticket.number, ticket.title, ticket.description, nameOf("customers", ticket.customerId), nameOf("students", ticket.studentId), ...ticket.tags].filter(Boolean).join(" ") }

export const mockTicketService: TicketService = {
  async getConfiguration() { return clone(ticketConfiguration) },
  async listTickets(query: TicketListQuery) {
    const actor = query.actor ?? fallbackActor
    const state = ticketRepository.read()
    const scoped = state.tickets.filter((ticket) => canViewTicket(ticket, actor))
    const filtered = filterAndSortTickets(scoped, query, searchable)
    const start = Number(query.cursor ?? 0), size = Math.min(query.pageSize ?? 20, 100), items = filtered.slice(start, start + size)
    return { items: items.map((ticket) => toSummary(ticket, actor, state.comments)), total: filtered.length, nextCursor: start + size < filtered.length ? String(start + size) : undefined }
  },
  async getTicket(ticketId, actor) { const state = ticketRepository.read(); return toDetail(findTicket(state.tickets, ticketId, actor), actor, state) },
  async getDashboard(actor) {
    const state = ticketRepository.read(), visible = state.tickets.filter((ticket) => canViewTicket(ticket, actor) && ticket.status !== "archived")
    const today = new Date().toDateString()
    return { mine: visible.filter((t) => t.employeeId === actor.employeeId).length, team: visible.filter((t) => t.teamId && actor.teamIds.includes(t.teamId)).length, open: visible.filter((t) => t.status !== "done").length, waiting: visible.filter((t) => t.status === "waiting").length, critical: visible.filter((t) => t.priority === "critical").length, closedToday: visible.filter((t) => t.completedAt && new Date(t.completedAt).toDateString() === today).length }
  },
  async createTicket(input, actor) {
    requirePermission(actor, ticketPermissions.create); const parsed = createTicketSchema.parse(input)
    return ticketRepository.mutate((state) => {
      const now = new Date().toISOString(); const ticket: Ticket = { ...parsed, teamId: parsed.teamId as TeamId | undefined, id: crypto.randomUUID() as TicketId, number: `TKT-${1050 + state.tickets.length}`, lastActiveStatus: parsed.status, branchId: null, createdBy: actor.userId as UserId, createdAt: now, updatedAt: now, version: 1 }
      state.tickets.push(ticket); state.activity.push(event(ticket, actor, "created", "تم إنشاء التذكرة")); return toDetail(ticket, actor, state)
    })
  },
  async updateTicket(ticketId, input, expectedVersion, actor) {
    requirePermission(actor, ticketPermissions.edit)
    return ticketRepository.mutate((state) => { const ticket = findTicket(state.tickets, ticketId, actor); assertVersion(ticket, expectedVersion); Object.assign(ticket, input, { updatedAt: new Date().toISOString(), version: ticket.version + 1 }); state.activity.push(event(ticket, actor, "updated", "تم تحديث بيانات التذكرة")); return toDetail(ticket, actor, state) })
  },
  async changeStatus(ticketId, status, expectedVersion, actor) {
    requirePermission(actor, ticketPermissions.changeStatus)
    return ticketRepository.mutate((state) => { const ticket = findTicket(state.tickets, ticketId, actor); assertVersion(ticket, expectedVersion); const previous = ticket.status; ticket.status = status; ticket.lastActiveStatus = status; ticket.completedAt = status === "done" ? new Date().toISOString() : undefined; ticket.updatedAt = new Date().toISOString(); ticket.version++; state.activity.push(event(ticket, actor, "status-changed", `تغيرت الحالة من ${nameOf("statuses", previous)} إلى ${nameOf("statuses", status)}`)); return toDetail(ticket, actor, state) })
  },
  async changePriority(ticketId, priority, expectedVersion, actor) {
    requirePermission(actor, ticketPermissions.changePriority)
    return ticketRepository.mutate((state) => { const ticket = findTicket(state.tickets, ticketId, actor); assertVersion(ticket, expectedVersion); ticket.priority = priority; ticket.updatedAt = new Date().toISOString(); ticket.version++; state.activity.push(event(ticket, actor, "priority-changed", `تم تغيير الأولوية إلى ${nameOf("priorities", priority)}`)); return toDetail(ticket, actor, state) })
  },
  async changeAssignment(ticketId, assignment, expectedVersion, actor) {
    if (assignment.teamId !== undefined) requirePermission(actor, ticketPermissions.assignTeam); if (assignment.employeeId !== undefined) requirePermission(actor, ticketPermissions.assignEmployee)
    return ticketRepository.mutate((state) => { const ticket = findTicket(state.tickets, ticketId, actor); assertVersion(ticket, expectedVersion); const employee = assignment.employeeId ? ticketConfiguration.employees.find((item) => item.id === assignment.employeeId) : undefined; if (assignment.teamId && employee && !employee.teamIds.includes(assignment.teamId as TeamId)) throw new TicketServiceError("assignment-mismatch", "الموظف ليس عضواً في الفريق المحدد"); ticket.teamId = assignment.teamId as TeamId | undefined; ticket.employeeId = assignment.employeeId; ticket.updatedAt = new Date().toISOString(); ticket.version++; state.activity.push(event(ticket, actor, "assignment-changed", "تم تحديث إسناد التذكرة")); return toDetail(ticket, actor, state) })
  },
  async addComment(ticketId, message, actor) {
    requirePermission(actor, ticketPermissions.comment); const parsed = commentSchema.parse({ message })
    return ticketRepository.mutate((state) => { const ticket = findTicket(state.tickets, ticketId, actor); state.comments.push({ id: crypto.randomUUID() as CommentId, ticketId, authorId: actor.userId as UserId, authorName: actor.name, message: parsed.message, createdAt: new Date().toISOString() }); ticket.updatedAt = new Date().toISOString(); ticket.version++; state.activity.push(event(ticket, actor, "comment-added", "تمت إضافة تعليق داخلي")); return toDetail(ticket, actor, state) })
  },
  async editComment(ticketId, commentId, message, actor) {
    requirePermission(actor, ticketPermissions.comment); const parsed = commentSchema.parse({ message })
    return ticketRepository.mutate((state) => { const ticket = findTicket(state.tickets, ticketId, actor); const comment = state.comments.find((item) => item.id === commentId && item.ticketId === ticketId); if (!comment || comment.authorId !== actor.userId) throw new TicketServiceError("forbidden", "يمكنك تعديل تعليقاتك فقط"); comment.message = parsed.message; comment.updatedAt = new Date().toISOString(); ticket.version++; state.activity.push(event(ticket, actor, "comment-edited", "تم تعديل تعليق داخلي")); return toDetail(ticket, actor, state) })
  },
  async deleteComment(ticketId, commentId, actor) {
    requirePermission(actor, ticketPermissions.comment)
    return ticketRepository.mutate((state) => { const ticket = findTicket(state.tickets, ticketId, actor); const comment = state.comments.find((item) => item.id === commentId && item.ticketId === ticketId); if (!comment || comment.authorId !== actor.userId) throw new TicketServiceError("forbidden", "يمكنك حذف تعليقاتك فقط"); state.comments = state.comments.filter((item) => item.id !== commentId); ticket.version++; state.activity.push(event(ticket, actor, "comment-deleted", "تم حذف تعليق داخلي")); return toDetail(ticket, actor, state) })
  },
  async uploadAttachment(ticketId, file, actor) {
    requirePermission(actor, ticketPermissions.attach); const accepted = file.type.startsWith("image/") || file.type === "application/pdf" || file.type.includes("document") || file.type.includes("word")
    if (!accepted) throw new TicketServiceError("unsupported-attachment", "نوع الملف غير مدعوم")
    return ticketRepository.mutate((state) => { const ticket = findTicket(state.tickets, ticketId, actor); const attachment = { id: crypto.randomUUID() as AttachmentId, ticketId, name: file.name, mimeType: file.type, sizeBytes: file.size, uploadedBy: actor.userId as UserId, uploadedAt: new Date().toISOString(), previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined }; state.attachments.push(attachment); ticket.version++; state.activity.push(event(ticket, actor, "attachment-added", `تم إرفاق ${file.name}`)); return attachment })
  },
  async archiveTicket(ticketId, expectedVersion, actor) { requirePermission(actor, ticketPermissions.archive); return ticketRepository.mutate((state) => { const ticket = findTicket(state.tickets, ticketId, actor); assertVersion(ticket, expectedVersion); if (ticket.status !== "archived") ticket.lastActiveStatus = ticket.status; ticket.status = "archived"; ticket.updatedAt = new Date().toISOString(); ticket.version++; state.activity.push(event(ticket, actor, "archived", "تمت أرشفة التذكرة")); return toDetail(ticket, actor, state) }) },
  async restoreTicket(ticketId, expectedVersion, actor) { requirePermission(actor, ticketPermissions.restore); return ticketRepository.mutate((state) => { const ticket = state.tickets.find((item) => item.id === ticketId); if (!ticket) throw new TicketServiceError("not-found", "التذكرة غير متاحة"); assertVersion(ticket, expectedVersion); ticket.status = ticket.lastActiveStatus ?? "backlog"; ticket.updatedAt = new Date().toISOString(); ticket.version++; state.activity.push(event(ticket, actor, "restored", "تمت استعادة التذكرة")); return toDetail(ticket, actor, state) }) },
  async deleteTicket(ticketId, actor) { requirePermission(actor, ticketPermissions.delete); ticketRepository.mutate((state) => { const ticket = state.tickets.find((item) => item.id === ticketId); if (!ticket) throw new TicketServiceError("not-found", "التذكرة غير متاحة"); state.tickets = state.tickets.filter((item) => item.id !== ticketId); state.comments = state.comments.filter((item) => item.ticketId !== ticketId); state.attachments = state.attachments.filter((item) => item.ticketId !== ticketId) }) },
  reset() { ticketRepository.reset() },
}
