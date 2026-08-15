import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DecisionPanel } from "@/features/accounting/components/decision-panel"
import type { ExpenseRequestDetail } from "@/features/accounting/types/projections"
import type { ExpenseStatus } from "@/features/accounting/types/common"

afterEach(cleanup)

const detail = (
  status: ExpenseStatus,
  availableTransitions: ExpenseStatus[],
  patch: Partial<ExpenseRequestDetail> = {}
): ExpenseRequestDetail =>
  ({
    id: "request-1",
    status,
    derived: { isEditable: false, availableTransitions, attachmentCount: 0 },
    permissions: {},
    history: [],
    comments: [],
    attachments: [],
    ...patch,
  }) as unknown as ExpenseRequestDetail

function renderPanel(request: ExpenseRequestDetail) {
  const onStartReview = vi.fn()
  const onDecide = vi.fn()
  const onMarkPaid = vi.fn()
  render(
    <DecisionPanel
      request={request}
      pending={false}
      onStartReview={onStartReview}
      onDecide={onDecide}
      onMarkPaid={onMarkPaid}
    />
  )
  return { onStartReview, onDecide, onMarkPaid }
}

/**
 * The panel derives its actions from `derived.availableTransitions`, which the
 * service computes from the policy table and the acting user's permissions. The
 * buttons shown are therefore provably the same set the service will accept.
 */
describe("the panel offers exactly the transitions the policy allows", () => {
  it("offers only start-review on a Submitted request", () => {
    renderPanel(detail("submitted", ["under-review", "cancelled"]))
    expect(screen.getByRole("button", { name: /بدء المراجعة/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^اعتماد$/ })).not.toBeInTheDocument()
  })

  it("offers the three decisions on a request Under Review", () => {
    renderPanel(
      detail("under-review", ["approved", "rejected", "returned-for-revision"])
    )
    expect(screen.getByRole("button", { name: /اعتماد/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /رفض/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /إعادة للتعديل/ })).toBeInTheDocument()
  })

  it("offers nothing on a terminal request and says so", () => {
    renderPanel(detail("paid", []))
    expect(screen.getByText(/لا توجد إجراءات متاحة/)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("offers nothing to a user whose permissions filtered the list empty", () => {
    // An Executive Manager sees the request and no actions at all.
    renderPanel(detail("under-review", []))
    expect(screen.getByText(/لا توجد إجراءات متاحة/)).toBeInTheDocument()
  })

  it("does not offer a decision merely because the status allows it", () => {
    // The service already removed transitions the user cannot perform.
    renderPanel(detail("under-review", ["cancelled"]))
    expect(screen.queryByRole("button", { name: /اعتماد/ })).not.toBeInTheDocument()
  })
})

describe("starting a review explains what it does", () => {
  it("says the reviewer will be recorded", () => {
    renderPanel(detail("submitted", ["under-review"]))
    expect(screen.getByText(/يسجّلك كمراجع/)).toBeInTheDocument()
  })

  it("calls back when used", async () => {
    const user = userEvent.setup()
    const { onStartReview } = renderPanel(detail("submitted", ["under-review"]))
    await user.click(screen.getByRole("button", { name: /بدء المراجعة/ }))
    expect(onStartReview).toHaveBeenCalledTimes(1)
  })
})

describe("a decision requiring a note cannot be submitted without one", () => {
  it("refuses a rejection with an empty note and announces why", async () => {
    const user = userEvent.setup()
    const { onDecide } = renderPanel(
      detail("under-review", ["approved", "rejected", "returned-for-revision"])
    )

    await user.click(screen.getByRole("button", { name: /رفض/ }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    // Confirm without writing a note. The last matching button is the one inside
    // the dialog; the first is the trigger that opened it.
    await user.click(screen.getAllByRole("button", { name: /رفض/ }).at(-1)!)

    expect(onDecide).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/الملاحظات مطلوبة/)
  })

  it("submits a rejection once a note is written", async () => {
    const user = userEvent.setup()
    const { onDecide } = renderPanel(
      detail("under-review", ["approved", "rejected", "returned-for-revision"])
    )

    await user.click(screen.getByRole("button", { name: /رفض/ }))
    await user.type(screen.getByLabelText(/ملاحظات/), "خارج الميزانية")
    await user.click(screen.getAllByRole("button", { name: /رفض/ }).at(-1)!)

    expect(onDecide).toHaveBeenCalledWith("rejected", "خارج الميزانية")
  })

  it("marks the note optional for an approval and submits without one", async () => {
    const user = userEvent.setup()
    const { onDecide } = renderPanel(
      detail("under-review", ["approved", "rejected", "returned-for-revision"])
    )

    await user.click(screen.getByRole("button", { name: /اعتماد/ }))
    expect(screen.getByText(/\(اختياري\)/)).toBeInTheDocument()
    await user.click(screen.getAllByRole("button", { name: /اعتماد/ }).at(-1)!)

    expect(onDecide).toHaveBeenCalledWith("approved", undefined)
  })

  it("requires a note for a return", async () => {
    const user = userEvent.setup()
    const { onDecide } = renderPanel(
      detail("under-review", ["approved", "rejected", "returned-for-revision"])
    )

    await user.click(screen.getByRole("button", { name: /إعادة للتعديل/ }))
    await user.click(screen.getAllByRole("button", { name: /إعادة للتعديل/ }).at(-1)!)

    expect(onDecide).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })
})

describe("a decision already made is shown with its author", () => {
  it("names who decided and when", () => {
    renderPanel(
      detail("approved", [], {
        decision: {
          decision: "approved",
          decidedAt: "2026-08-01T09:00:00.000Z",
          decidedBy: { id: "user-admin", name: "مدير النظام", active: true },
        },
      } as Partial<ExpenseRequestDetail>)
    )
    // An administrative override must be visible as one.
    expect(screen.getByText(/مدير النظام/)).toBeInTheDocument()
  })

  it("shows the decision note", () => {
    renderPanel(
      detail("rejected", [], {
        decision: {
          decision: "rejected",
          note: "خارج الميزانية",
          decidedAt: "2026-08-01T09:00:00.000Z",
          decidedBy: { id: "u", name: "مدير مالي", active: true },
        },
      } as Partial<ExpenseRequestDetail>)
    )
    expect(screen.getByText("خارج الميزانية")).toBeInTheDocument()
  })

  it("names the current reviewer while under review", () => {
    renderPanel(
      detail("under-review", ["approved"], {
        reviewer: { id: "u", name: "مدير مالي", active: true },
      } as Partial<ExpenseRequestDetail>)
    )
    expect(screen.getByText(/المراجع: مدير مالي/)).toBeInTheDocument()
  })
})
