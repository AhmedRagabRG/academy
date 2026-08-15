import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DecisionPanel } from "@/features/accounting/components/decision-panel"
import { MarkPaidDialog } from "@/features/accounting/components/mark-paid-dialog"
import type { ExpenseRequestDetail } from "@/features/accounting/types/projections"
import type { ExpenseStatus } from "@/features/accounting/types/common"

afterEach(cleanup)

const detail = (
  status: ExpenseStatus,
  availableTransitions: ExpenseStatus[]
): ExpenseRequestDetail =>
  ({
    id: "request-1",
    status,
    derived: { isEditable: false, availableTransitions, attachmentCount: 0 },
    permissions: {},
    history: [],
    comments: [],
    attachments: [],
  }) as unknown as ExpenseRequestDetail

function renderPanel(request: ExpenseRequestDetail) {
  const onMarkPaid = vi.fn()
  render(
    <DecisionPanel
      request={request}
      pending={false}
      onStartReview={vi.fn()}
      onDecide={vi.fn()}
      onMarkPaid={onMarkPaid}
    />
  )
  return { onMarkPaid }
}

describe("the mark-paid action appears only where it applies", () => {
  it("is offered on an Approved request when the user holds the key", () => {
    renderPanel(detail("approved", ["paid"]))
    expect(screen.getByRole("button", { name: /تسجيل السداد/ })).toBeInTheDocument()
  })

  it("is not offered on a request Under Review", () => {
    renderPanel(detail("under-review", ["approved", "rejected"]))
    expect(screen.queryByRole("button", { name: /تسجيل السداد/ })).not.toBeInTheDocument()
  })

  it("is not offered on an already Paid request", () => {
    renderPanel(detail("paid", []))
    expect(screen.queryByRole("button", { name: /تسجيل السداد/ })).not.toBeInTheDocument()
    expect(screen.getByText(/لا توجد إجراءات متاحة/)).toBeInTheDocument()
  })

  it("is not offered to a user whose permissions filtered it out", () => {
    // The service removes transitions the user cannot perform, so an Approved
    // request with an empty list means the key is absent.
    renderPanel(detail("approved", []))
    expect(screen.queryByRole("button", { name: /تسجيل السداد/ })).not.toBeInTheDocument()
  })
})

describe("marking paid states what it actually does", () => {
  it("says the transfer happens outside this module", async () => {
    const user = userEvent.setup()
    renderPanel(detail("approved", ["paid"]))
    await user.click(screen.getByRole("button", { name: /تسجيل السداد/ }))

    // Someone clicking this must not believe they are releasing funds.
    expect(screen.getByRole("note")).toHaveTextContent(/خارج هذه الوحدة/)
  })

  it("confirms before acting", async () => {
    const user = userEvent.setup()
    const { onMarkPaid } = renderPanel(detail("approved", ["paid"]))
    await user.click(screen.getByRole("button", { name: /تسجيل السداد/ }))

    expect(onMarkPaid).not.toHaveBeenCalled()
    await user.click(screen.getAllByRole("button", { name: /تسجيل السداد/ }).at(-1)!)
    expect(onMarkPaid).toHaveBeenCalledTimes(1)
  })

  it("can be dismissed without acting", async () => {
    const user = userEvent.setup()
    const { onMarkPaid } = renderPanel(detail("approved", ["paid"]))
    await user.click(screen.getByRole("button", { name: /تسجيل السداد/ }))
    await user.click(screen.getByRole("button", { name: "إلغاء" }))

    expect(onMarkPaid).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("the dialog manages focus", () => {
  it("focuses the confirm button on open", () => {
    render(<MarkPaidDialog pending={false} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole("button", { name: /تسجيل السداد/ })).toHaveFocus()
  })

  it("disables confirmation while pending", () => {
    render(<MarkPaidDialog pending onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole("button", { name: /جارٍ التسجيل/ })).toBeDisabled()
  })
})
