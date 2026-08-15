import { describe, expect, it } from "vitest"
import { mockInboxService } from "@/features/inbox/services/mock-inbox-service"
import { defaultInboxQuery } from "@/features/inbox/stores/inbox-workspace-store"

describe("Inbox management integration", () => {
  it("updates dashboard projections after status changes", async () => {
    mockInboxService.reset()
    const before = await mockInboxService.dashboard(defaultInboxQuery)
    const row = (await mockInboxService.list(defaultInboxQuery)).items.find(
      (item) => item.status !== "closed"
    )!
    await mockInboxService.changeStatus(row.id, "closed")
    expect(
      (await mockInboxService.dashboard(defaultInboxQuery)).open
    ).toBeLessThanOrEqual(before.open)
  })
})
