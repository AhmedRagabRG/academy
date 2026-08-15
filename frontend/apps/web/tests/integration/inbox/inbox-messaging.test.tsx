import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MessageList } from "@/features/inbox/components/message-list"
// Contract fixture inspection is intentional in this isolated renderer test.
// eslint-disable-next-line no-restricted-imports
import { conversations } from "@/features/inbox/data/inbox-fixtures"

describe("Inbox messaging integration", () => {
  it("renders the customer-visible chronological log", () => {
    render(<MessageList messages={conversations[0]!.messages} />)
    expect(screen.getByRole("log", { name: "سجل الرسائل" })).toBeVisible()
    expect(screen.getAllByRole("article")).toHaveLength(2)
  })
})
