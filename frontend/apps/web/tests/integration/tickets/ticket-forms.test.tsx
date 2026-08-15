import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TicketCommentsPanel } from "@/features/tickets/components/ticket-comments-panel"
import { TicketForm } from "@/features/tickets/forms/ticket-form"
import { ticketConfiguration } from "@/features/tickets/config/ticket-configuration"

describe("Ticket API-backed forms", () => {
  it("submits the department UUID supplied by the backend configuration", async () => {
    const onSubmit = vi.fn()
    const departmentId = "8ed9517e-8fb9-4fb7-8ca4-943b6761ade8"
    render(
      <TicketForm
        configuration={{
          ...ticketConfiguration,
          departments: [{ id: departmentId, name: "خدمة العملاء" }],
        }}
        onSubmit={onSubmit}
      />
    )

    await userEvent.type(screen.getByLabelText("العنوان"), "طلب متابعة جديد")
    await userEvent.type(screen.getByLabelText("الوصف"), "تفاصيل طلب المتابعة")
    await userEvent.click(screen.getByRole("button", { name: "إنشاء التذكرة" }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ departmentId }),
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
