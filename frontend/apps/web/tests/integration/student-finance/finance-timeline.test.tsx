import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Timeline } from "@/shared/components/data-display/timeline"
import {
  eventCopy,
  formatEventTime,
  toTimelineItem,
} from "@/features/student-finance/components/finance-timeline-mapping"
import { makeMoney } from "@/shared/utils/money"
import type { FinanceTimelineEvent } from "@/features/student-finance/types/domain"

afterEach(cleanup)

const event = (
  id: string,
  category: FinanceTimelineEvent["category"],
  occurredAt: string,
  amount?: string
): FinanceTimelineEvent =>
  ({
    id,
    studentId: "student-1",
    category,
    occurredAt,
    sequence: Number(id.replace(/\D/g, "")) || 1,
    actor: { id: "employee-1", name: "موظف مالي", active: true },
    summary: `ملخص ${id}`,
    amount: amount ? makeMoney(amount, "EGP", 2) : undefined,
  }) as FinanceTimelineEvent

const page1 = [
  event("e4", "refund-completed", "2026-05-01T09:00:00.000Z", "500.00"),
  event("e3", "payment-received", "2026-04-01T09:00:00.000Z", "1500.00"),
]
const page2 = [
  event("e2", "invoice-issued", "2026-03-01T09:00:00.000Z", "6000.00"),
  event("e1", "invoice-created", "2026-02-01T09:00:00.000Z", "6000.00"),
]

describe("event presentation", () => {
  it("names the category in Arabic rather than showing a raw key", () => {
    const item = toTimelineItem(page1[1]!)
    expect(item.title).toContain(eventCopy["payment-received"])
    expect(item.title).not.toContain("payment-received")
  })

  it("carries the amount where the event has one", () => {
    const item = toTimelineItem(page1[1]!)
    // A financial timeline without figures makes the reader open every record.
    expect(item.title).toMatch(/١|1/)
  })

  it("omits the amount where the event has none", () => {
    const item = toTimelineItem(
      event("e9", "installment-plan-generated", "2026-06-01T09:00:00.000Z")
    )
    expect(item.title).toBe(eventCopy["installment-plan-generated"])
  })

  it("carries the actor and a machine-readable time", () => {
    const item = toTimelineItem(page1[0]!)
    expect(item.actor).toBe("موظف مالي")
    expect(item.occurredAt).toBe("2026-05-01T09:00:00.000Z")
    expect(item.occurredAtLabel).not.toBe("—")
  })

  it("gives every category a label, an icon, and a tone", () => {
    for (const category of Object.keys(eventCopy) as Array<
      FinanceTimelineEvent["category"]
    >) {
      const item = toTimelineItem(event("e1", category, "2026-01-01T09:00:00.000Z"))
      expect(item.title, category).toBeTruthy()
      expect(item.icon, category).toBeDefined()
      expect(item.tone, category).toBeDefined()
    }
  })

  it("does not crash on an unparseable time", () => {
    expect(formatEventTime("not-a-date")).toBe("—")
  })
})

describe("incremental loading preserves order", () => {
  const renderPages = (
    items: FinanceTimelineEvent[],
    hasMore: boolean,
    onLoadMore = vi.fn()
  ) => {
    render(
      <Timeline
        items={items.map(toTimelineItem)}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />
    )
    return onLoadMore
  }

  it("renders the first page newest-first", () => {
    renderPages(page1, true)
    const entries = screen.getAllByRole("listitem")
    expect(entries).toHaveLength(2)
    expect(entries[0]).toHaveTextContent(eventCopy["refund-completed"])
    expect(entries[1]).toHaveTextContent(eventCopy["payment-received"])
  })

  it("offers a load-more control only while more remain", () => {
    renderPages(page1, true)
    expect(screen.getByRole("button", { name: /عرض المزيد/ })).toBeInTheDocument()
    cleanup()
    renderPages([...page1, ...page2], false)
    expect(
      screen.queryByRole("button", { name: /عرض المزيد/ })
    ).not.toBeInTheDocument()
  })

  it("asks for the next page when the control is used", async () => {
    const onLoadMore = renderPages(page1, true)
    await userEvent.setup().click(screen.getByRole("button", { name: /عرض المزيد/ }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it("appends the next page below without reordering what was read", () => {
    renderPages([...page1, ...page2], false)
    const entries = screen.getAllByRole("listitem")
    expect(entries.map((entry) => entry.textContent)).toEqual([
      expect.stringContaining(eventCopy["refund-completed"]),
      expect.stringContaining(eventCopy["payment-received"]),
      expect.stringContaining(eventCopy["invoice-issued"]),
      expect.stringContaining(eventCopy["invoice-created"]),
    ])
  })

  it("keeps every event's identity across the append", () => {
    renderPages([...page1, ...page2], false)
    // Four distinct events, none repeated by the paging boundary.
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    for (const summary of ["ملخص e1", "ملخص e2", "ملخص e3", "ملخص e4"])
      expect(screen.getByText(summary)).toBeInTheDocument()
  })

  it("renders an ordered list, so order is conveyed structurally", () => {
    renderPages(page1, false)
    expect(screen.getByRole("list").tagName).toBe("OL")
  })
})
