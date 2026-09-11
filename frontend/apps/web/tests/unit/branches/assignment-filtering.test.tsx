import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { TicketAssignmentPanel } from "@/features/tickets/components/ticket-assignment-panel"
import { ticketConfiguration } from "@/features/tickets/config/ticket-configuration"
import type { TicketDetail } from "@/features/tickets/types/projections"

afterEach(cleanup)

const ticket = (branchId: string | null, employeeId?: string) =>
  ({
    id: "ticket-1",
    number: "TKT-1",
    title: "تذكرة",
    description: "وصف",
    status: "todo",
    lastActiveStatus: "todo",
    priority: "medium",
    employeeId,
    branchId,
    tags: [],
    createdBy: "employee-demo",
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
    version: 1,
    commentCount: 0,
    capabilities: {},
    comments: [],
    activity: [],
    attachments: [],
  }) as unknown as TicketDetail

/** Employee select only — the team select alongside it is not branch-filtered. */
const optionNames = () =>
  Array.from(
    screen.getByRole("combobox", { name: "الموظف" }).querySelectorAll("option")
  )
    .map((option) => option.textContent)
    .filter((text) => text !== "غير مسند")

/**
 * The fixtures put أحمد in Cairo, سارة in Giza and عمر in no branch at all.
 * Assigning a ticket to someone who cannot see its branch is a silent dead
 * end — the save succeeds and the work disappears from the assignee's view.
 */
describe("TicketAssignmentPanel branch filtering", () => {
  it("offers only employees who can see the ticket's branch", () => {
    render(
      <TicketAssignmentPanel
        ticket={ticket("branch-cairo")}
        config={ticketConfiguration}
        onAssign={vi.fn()}
      />
    )
    const names = optionNames()
    expect(names).toContain("أحمد محمد")
    // عمر has no branches, which means unrestricted, so he stays offered.
    expect(names).toContain("عمر حسن")
    expect(names).not.toContain("سارة علي")
  })

  it("offers everyone when the ticket has no branch", () => {
    // Every ticket predating branches has a null branchId. If those narrowed
    // to nobody, assignment would break across the whole existing backlog.
    render(
      <TicketAssignmentPanel
        ticket={ticket(null)}
        config={ticketConfiguration}
        onAssign={vi.fn()}
      />
    )
    expect(optionNames()).toHaveLength(ticketConfiguration.employees.length)
  })

  it("keeps an existing assignee who no longer matches the branch", () => {
    // Otherwise the select silently falls back to "غير مسند" and re-saving an
    // untouched form unassigns the ticket.
    render(
      <TicketAssignmentPanel
        ticket={ticket("branch-cairo", "employee-sara")}
        config={ticketConfiguration}
        onAssign={vi.fn()}
      />
    )
    expect(optionNames()).toContain("سارة علي")
  })
})
