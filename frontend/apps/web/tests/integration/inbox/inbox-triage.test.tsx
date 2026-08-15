import { describe, expect, it } from "vitest"
import { mockInboxService } from "@/features/inbox/services/mock-inbox-service"
import { defaultInboxQuery } from "@/features/inbox/stores/inbox-workspace-store"

describe("Inbox triage integration", () => {
  it("keeps archived conversations searchable", async () => {
    const archived = await mockInboxService.list({
      ...defaultInboxQuery,
      view: "archived",
    })
    expect(archived.items.every((item) => item.status === "archived")).toBe(
      true
    )
  })
})
