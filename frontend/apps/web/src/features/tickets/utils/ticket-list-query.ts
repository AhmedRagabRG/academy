import type { Ticket } from "../types/domain"
import type { TicketListQuery } from "../types/commands"

export function normalizeSearch(value = "") {
  return value.trim().toLocaleLowerCase("ar-EG").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي")
}

export function filterAndSortTickets(tickets: Ticket[], query: TicketListQuery, searchable: (ticket: Ticket) => string) {
  const term = normalizeSearch(query.search)
  const f = query.filters
  const priorityWeight = { low: 1, medium: 2, high: 3, critical: 4 }
  return tickets.filter((ticket) => {
    if (query.mode === "archived" ? ticket.status !== "archived" : ticket.status === "archived") return false
    if (query.status && ticket.status !== query.status) return false
    if (term && !normalizeSearch(searchable(ticket)).includes(term)) return false
    if (f?.statuses?.length && !f.statuses.includes(ticket.status)) return false
    if (f?.priorities?.length && !f.priorities.includes(ticket.priority)) return false
    if (f?.teamIds?.length && (!ticket.teamId || !f.teamIds.includes(ticket.teamId))) return false
    if (f?.employeeIds?.length && (!ticket.employeeId || !f.employeeIds.includes(ticket.employeeId))) return false
    if (f?.tags?.length && !f.tags.some((tag) => ticket.tags.includes(tag))) return false
    return true
  }).sort((a, b) => {
    if (query.sort === "oldest") return a.createdAt.localeCompare(b.createdAt)
    if (query.sort === "priority") return priorityWeight[b.priority] - priorityWeight[a.priority] || b.updatedAt.localeCompare(a.updatedAt)
    if (query.sort === "newest") return b.createdAt.localeCompare(a.createdAt)
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}
