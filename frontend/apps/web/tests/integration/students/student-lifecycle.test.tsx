import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StudentStatusDialog } from "@/features/students/components/student-status-dialog"

afterEach(cleanup)

describe("status transition dialog", () => {
  it("marks the reason as required for a transition that demands one", () => {
    render(
      <StudentStatusDialog
        open
        fromStatus="active"
        toStatus="suspended"
        pending={false}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    )
    expect(screen.getByText(/السبب \(مطلوب\)/)).toBeInTheDocument()
  })

  it("marks the reason as optional where the policy allows", () => {
    render(
      <StudentStatusDialog
        open
        fromStatus="active"
        toStatus="graduated"
        pending={false}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    )
    expect(screen.getByText(/السبب \(اختياري\)/)).toBeInTheDocument()
  })

  it("blocks confirmation until a required reason is entered", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <StudentStatusDialog
        open
        fromStatus="active"
        toStatus="withdrawn"
        pending={false}
        onConfirm={onConfirm}
        onClose={() => undefined}
      />
    )

    const confirm = screen.getByRole("button", { name: "تأكيد" })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByRole("textbox"), "انسحب بناءً على طلبه")
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith("انسحب بناءً على طلبه")
  })

  it("confirms without a reason when the policy does not require one", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <StudentStatusDialog
        open
        fromStatus="archived"
        toStatus="active"
        pending={false}
        onConfirm={onConfirm}
        onClose={() => undefined}
      />
    )

    await user.click(screen.getByRole("button", { name: "تأكيد" }))
    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })

  it("announces a missing required reason after the field is touched", async () => {
    const user = userEvent.setup()
    render(
      <StudentStatusDialog
        open
        fromStatus="active"
        toStatus="suspended"
        pending={false}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    )

    await user.click(screen.getByRole("textbox"))
    await user.tab()
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("يجب إدخال سبب لتنفيذ هذا الإجراء")
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true")
  })

  it("flags a correction out of a terminal status", () => {
    render(
      <StudentStatusDialog
        open
        fromStatus="graduated"
        toStatus="active"
        pending={false}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    )
    expect(
      screen.getByText(/إجراء تصحيحي يتطلب صلاحية خاصة/)
    ).toBeInTheDocument()
  })

  it("is a modal dialog and moves focus into itself on open", () => {
    render(
      <StudentStatusDialog
        open
        fromStatus="active"
        toStatus="suspended"
        pending={false}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    )
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it("disables confirmation while the change is in flight", () => {
    render(
      <StudentStatusDialog
        open
        fromStatus="active"
        toStatus="graduated"
        pending
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    )
    expect(screen.getByRole("button", { name: /جارٍ التنفيذ/ })).toBeDisabled()
  })

  it("renders nothing when closed or without a target status", () => {
    const { container, rerender } = render(
      <StudentStatusDialog
        open={false}
        fromStatus="active"
        toStatus="suspended"
        pending={false}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    )
    expect(container).toBeEmptyDOMElement()

    rerender(
      <StudentStatusDialog
        open
        fromStatus="active"
        pending={false}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
