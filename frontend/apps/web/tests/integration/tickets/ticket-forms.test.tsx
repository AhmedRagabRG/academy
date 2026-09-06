import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TicketCommentsPanel } from "@/features/tickets/components/ticket-comments-panel"
import { TicketForm } from "@/features/tickets/forms/ticket-form"
import { ticketConfiguration } from "@/features/tickets/config/ticket-configuration"

describe("Ticket API-backed forms", () => {
  it("submits the ticket details supplied by the user", async () => {
    const onSubmit = vi.fn()
    render(
      <TicketForm
        configuration={ticketConfiguration}
        onSubmit={onSubmit}
      />
    )

    await userEvent.type(screen.getByLabelText("العنوان"), "طلب متابعة جديد")
    await userEvent.type(screen.getByLabelText("الوصف"), "تفاصيل طلب المتابعة")
    await userEvent.click(screen.getByRole("button", { name: "إنشاء التذكرة" }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "طلب متابعة جديد",
        description: "تفاصيل طلب المتابعة",
        status: "backlog",
        priority: "medium",
      }),
      expect.anything()
    )
  })

  it("keeps an internal comment when the API submission fails", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("تعذر إضافة التعليق"))
    render(
      <TicketCommentsPanel
        comments={[]}
        actorId="employee"
        onAdd={onAdd}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    const editor = screen.getByLabelText("تعليق جديد")
    await userEvent.type(editor, "متابعة داخلية")
    await userEvent.click(screen.getByRole("button", { name: "إضافة تعليق" }))

    expect(onAdd).toHaveBeenCalledWith("متابعة داخلية")
    expect(editor).toHaveValue("متابعة داخلية")
  })
})
