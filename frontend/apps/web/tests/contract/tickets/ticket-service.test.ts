import { beforeEach, describe, expect, it } from "vitest"
import { mockTicketService, defaultTicketActor } from "@/features/tickets/services/mock-ticket-service"
import { ticketPermissions } from "@/features/tickets/config/ticket-permissions"
import type { TicketId } from "@/features/tickets/types/common"

describe("TicketService contract", () => {
  beforeEach(() => mockTicketService.reset())
  it("returns scoped cards and matching dashboard", async () => {
    const page = await mockTicketService.listTickets({ actor: defaultTicketActor, pageSize: 100 })
    const dashboard = await mockTicketService.getDashboard(defaultTicketActor)
    expect(page.items.length).toBeGreaterThan(0)
    expect(dashboard.open).toBe(page.items.filter((ticket) => ticket.status !== "done").length)
  })
  it("changes status and appends immutable activity", async () => {
    const before = await mockTicketService.getTicket("ticket-1" as TicketId, defaultTicketActor)
    const after = await mockTicketService.changeStatus(before.id, "review", before.version, defaultTicketActor)
    expect(after.status).toBe("review")
    expect(after.activity.at(-1)?.type).toBe("status-changed")
    await expect(mockTicketService.changeStatus(before.id, "done", before.version, defaultTicketActor)).rejects.toMatchObject({ code: "version-conflict" })
  })
  it("enforces visibility and command permissions inside the service", async () => {
    const restricted = { userId: "other", name: "مستخدم", employeeId: "other", teamIds: [], permissions: [ticketPermissions.viewAssigned] }
    await expect(mockTicketService.getTicket("ticket-1" as TicketId, restricted)).rejects.toMatchObject({ code: "not-found" })
    const viewer = { ...defaultTicketActor, permissions: [ticketPermissions.viewAll] }
    const ticket = await mockTicketService.getTicket("ticket-1" as TicketId, viewer)
    await expect(mockTicketService.changeStatus(ticket.id, "done", ticket.version, viewer)).rejects.toMatchObject({ code: "forbidden" })
  })
  it("validates assignment membership and comment ownership", async () => {
    const ticket = await mockTicketService.getTicket("ticket-1" as TicketId, defaultTicketActor)
    await expect(mockTicketService.changeAssignment(ticket.id, { teamId: "team-finance", employeeId: "employee-sara" }, ticket.version, defaultTicketActor)).rejects.toMatchObject({ code: "assignment-mismatch" })
    const updated = await mockTicketService.addComment(ticket.id, "متابعة جديدة", defaultTicketActor)
    const own = updated.comments.at(-1)!
    const other = { ...defaultTicketActor, userId: "employee-sara", name: "سارة" }
    await expect(mockTicketService.deleteComment(ticket.id, own.id, other)).rejects.toMatchObject({ code: "forbidden" })
  })
  it("archives and restores to the last active state", async () => {
    const ticket = await mockTicketService.getTicket("ticket-2" as TicketId, defaultTicketActor)
    const archived = await mockTicketService.archiveTicket(ticket.id, ticket.version, defaultTicketActor)
    expect(archived.status).toBe("archived")
    const restored = await mockTicketService.restoreTicket(ticket.id, archived.version, defaultTicketActor)
    expect(restored.status).toBe(ticket.status)
  })
})
