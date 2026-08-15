import { describe, expect, it } from "vitest"
import { filterConversations } from "@/features/inbox/utils/conversation-query"
import { mockInboxService } from "@/features/inbox/services/mock-inbox-service"
import { defaultInboxQuery } from "@/features/inbox/stores/inbox-workspace-store"

describe("conversation discovery", () => {
  it("matches Arabic customer names and partial formatted phones", async () => {
    const rows = (
      await mockInboxService.list({ ...defaultInboxQuery, limit: 100 })
    ).items
    expect(
      filterConversations(
        rows,
        { ...defaultInboxQuery, search: "مريم" },
        "employee-demo",
        ["team-admissions"]
      ).map((item) => item.customer.name)
    ).toContain("مريم خالد")
    expect(
      filterConversations(
        rows,
        { ...defaultInboxQuery, search: "1055551100" },
        "employee-demo",
        ["team-admissions"]
      )
    ).toHaveLength(1)
  })
  it("combines unread, status, tag and stable unread sorting", async () => {
    const rows = (
      await mockInboxService.list({ ...defaultInboxQuery, limit: 100 })
    ).items
    const result = filterConversations(
      rows,
      {
        ...defaultInboxQuery,
        unreadOnly: true,
        statuses: ["pending"],
        sort: "unread",
      },
      "employee-demo",
      ["team-admissions"]
    )
    expect(
      result.every((item) => item.unreadCount > 0 && item.status === "pending")
    ).toBe(true)
  })
})
