import { describe, expect, it } from "vitest"
import { createTicketSchema } from "@/features/tickets/schemas/ticket-schemas"
import { normalizeSearch, filterAndSortTickets } from "@/features/tickets/utils/ticket-list-query"
import { canViewTicket } from "@/features/tickets/utils/ticket-scope"
import { ticketFixtures } from "@/features/tickets/data/ticket-fixtures"
import { ticketPermissions } from "@/features/tickets/config/ticket-permissions"

describe("ticket foundation", () => {
  it("validates required ticket content", () => {
    expect(createTicketSchema.safeParse({ title: "x" }).success).toBe(false)
    expect(createTicketSchema.safeParse({ title: "طلب جديد", description: "وصف واضح", status: "backlog", priority: "medium", departmentId: "support", tags: [] }).success).toBe(true)
  })
  it("normalizes Arabic search", () => expect(normalizeSearch("  إستفسار  ")).toBe("استفسار"))
  it("applies assigned, team, and global scope", () => {
    const ticket = ticketFixtures[0]!
    expect(canViewTicket(ticket, { userId: "x", name: "x", employeeId: "employee-demo", teamIds: [], permissions: [ticketPermissions.viewAssigned] })).toBe(true)
    expect(canViewTicket(ticket, { userId: "x", name: "x", employeeId: "other", teamIds: ["team-support"], permissions: [ticketPermissions.viewTeam] })).toBe(true)
    expect(canViewTicket(ticket, { userId: "x", name: "x", teamIds: [], permissions: [ticketPermissions.viewAll] })).toBe(true)
  })
  it("filters and sorts deterministically", () => {
    const rows = filterAndSortTickets(ticketFixtures, { search: "تسجيل", sort: "priority" }, (ticket) => `${ticket.title} ${ticket.tags.join(" ")}`)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0]?.priority).toBe("critical")
  })
})
