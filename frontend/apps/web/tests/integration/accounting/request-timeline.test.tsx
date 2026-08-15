import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ApprovalTimeline } from "@/features/accounting/components/approval-timeline"
import { CommentsPanel } from "@/features/accounting/components/comments-panel"
import {
  actionCopy,
  allHistoryActions,
  formatHistoryMoment,
  toTimelineItem,
} from "@/features/accounting/components/history-mapping"
import type {
  ExpenseComment,
  HistoryEntry,
} from "@/features/accounting/types/domain"
import type { HistoryAction } from "@/features/accounting/types/common"

afterEach(cleanup)

const entry = (
  id: string,
  action: HistoryAction,
  fromStatus: HistoryEntry["fromStatus"],
  toStatus: HistoryEntry["toStatus"],
  occurredAt: string,
  note?: string
): HistoryEntry =>
  ({
    id,
    requestId: "request-1",
    action,
    fromStatus,
    toStatus,
    performedBy: { id: "u1", name: "مدير مالي", active: true },
    occurredAt,
    sequence: Number(id.replace(/\D/g, "")) || 1,
    note,
  }) as HistoryEntry

const journey: HistoryEntry[] = [
  entry("h1", "created", null, "draft", "2026-07-01T09:00:00.000Z"),
  entry("h2", "submitted", "draft", "submitted", "2026-07-02T09:00:00.000Z"),
  entry("h3", "review-started", "submitted", "under-review", "2026-07-03T09:00:00.000Z"),
  entry(
    "h4",
    "returned",
    "under-review",
    "returned-for-revision",
    "2026-07-04T09:00:00.000Z",
    "يحتاج عرض سعر"
  ),
  entry("h5", "resubmitted", "returned-for-revision", "submitted", "2026-07-05T09:00:00.000Z"),
  entry("h6", "approved", "under-review", "approved", "2026-07-06T09:00:00.000Z"),
]

describe("every action is presented in Arabic", () => {
  it("shows a label for each entry rather than a raw key", () => {
    render(<ApprovalTimeline history={journey} />)
    expect(screen.getByText(actionCopy.created)).toBeInTheDocument()
    expect(screen.getByText(actionCopy.approved)).toBeInTheDocument()
    expect(screen.queryByText("review-started")).not.toBeInTheDocument()
  })

  it("gives every one of the nine actions a label, an icon, and a tone", () => {
    for (const action of allHistoryActions) {
      const item = toTimelineItem(
        entry("h1", action, "draft", "submitted", "2026-07-01T09:00:00.000Z")
      )
      expect(item.title, action).toBeTruthy()
      expect(item.icon, action).toBeDefined()
      expect(item.tone, action).toBeDefined()
    }
  })

  it("distinguishes a resubmission from a first submission", () => {
    render(<ApprovalTimeline history={journey} />)
    expect(screen.getByText(actionCopy.submitted)).toBeInTheDocument()
    expect(screen.getByText(actionCopy.resubmitted)).toBeInTheDocument()
  })
})

describe("each entry states both ends of the transition", () => {
  it("names the previous and the new status", () => {
    // "Returned" alone does not say what it was returned *from*, and a reader
    // reconstructing a disputed sequence needs both ends of every hop.
    const item = toTimelineItem(journey[3]!)
    expect(item.description).toContain("قيد المراجعة")
    expect(item.description).toContain("مُعاد للتعديل")
  })

  it("shows only the new status for the creating entry, which has no previous", () => {
    const item = toTimelineItem(journey[0]!)
    expect(item.description).toBe("مسودة")
  })

  it("includes the note alongside the transition when there is one", () => {
    const item = toTimelineItem(journey[3]!)
    expect(item.description).toContain("يحتاج عرض سعر")
  })

  it("carries the actor and a machine-readable time", () => {
    const item = toTimelineItem(journey[1]!)
    expect(item.actor).toBe("مدير مالي")
    expect(item.occurredAt).toBe("2026-07-02T09:00:00.000Z")
  })

  it("renders an unparseable time as a dash rather than Invalid Date", () => {
    expect(formatHistoryMoment("not-a-date")).toBe("—")
  })
})

describe("the timeline reads as a narrative", () => {
  it("renders one list item per entry, oldest first", () => {
    render(<ApprovalTimeline history={journey} />)
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(journey.length)
    expect(items[0]).toHaveTextContent(actionCopy.created)
    expect(items.at(-1)).toHaveTextContent(actionCopy.approved)
  })

  it("uses an ordered list, so sequence is conveyed structurally", () => {
    render(<ApprovalTimeline history={journey} />)
    expect(screen.getByRole("list").tagName).toBe("OL")
  })

  it("states that the record cannot be edited", () => {
    // A history is only worth reading if the reader knows it cannot have changed.
    render(<ApprovalTimeline history={journey} />)
    expect(screen.getByText(/غير قابل للتعديل/)).toBeInTheDocument()
  })

  it("shows an empty state rather than a blank panel", () => {
    render(<ApprovalTimeline history={[]} />)
    expect(screen.getByText(/لا يوجد سجل بعد/)).toBeInTheDocument()
  })

  it("offers no control that would edit or remove an entry", () => {
    render(<ApprovalTimeline history={journey} />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("comments are visibly distinct from the history", () => {
  const comments: ExpenseComment[] = [
    {
      id: "c1",
      requestId: "request-1",
      body: "أرفقت عرض السعر الثاني",
      author: { id: "u2", name: "مدير فرع", active: true },
      createdAt: "2026-07-04T10:00:00.000Z",
    },
  ] as ExpenseComment[]

  it("says comments are not part of the approval record", () => {
    render(<CommentsPanel comments={comments} canAdd={false} onAdd={vi.fn()} />)
    expect(screen.getByText(/لا تُعدّ جزءًا من سجل الاعتماد/)).toBeInTheDocument()
  })

  it("shows each comment with its author and time", () => {
    render(<CommentsPanel comments={comments} canAdd={false} onAdd={vi.fn()} />)
    expect(screen.getByText("أرفقت عرض السعر الثاني")).toBeInTheDocument()
    expect(screen.getByText(/مدير فرع/)).toBeInTheDocument()
  })

  it("hides the composer from a user who may not comment", () => {
    render(<CommentsPanel comments={comments} canAdd={false} onAdd={vi.fn()} />)
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("submits a trimmed comment and clears the box", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<CommentsPanel comments={comments} canAdd onAdd={onAdd} />)

    await user.type(screen.getByRole("textbox"), "  ملاحظة جديدة  ")
    await user.click(screen.getByRole("button", { name: /إضافة تعليق/ }))

    expect(onAdd).toHaveBeenCalledWith("ملاحظة جديدة")
    expect(screen.getByRole("textbox")).toHaveValue("")
  })

  it("cannot submit an empty comment", async () => {
    const onAdd = vi.fn()
    render(<CommentsPanel comments={comments} canAdd onAdd={onAdd} />)
    expect(screen.getByRole("button", { name: /إضافة تعليق/ })).toBeDisabled()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it("shows an empty state when there are none", () => {
    render(<CommentsPanel comments={[]} canAdd={false} onAdd={vi.fn()} />)
    expect(screen.getByText(/لا توجد تعليقات/)).toBeInTheDocument()
  })
})
