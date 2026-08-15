import { beforeEach, describe, expect, it } from "vitest"
import { mockInboxService } from "@/features/inbox/services/mock-inbox-service"
import { defaultInboxQuery } from "@/features/inbox/stores/inbox-workspace-store"
import type { EmployeeId, TeamId } from "@/features/inbox/types/common"

describe("Inbox management contract", () => {
  beforeEach(() => mockInboxService.reset())
  it("appends immutable assignment history", async () => {
    const id = (await mockInboxService.list(defaultInboxQuery)).items[0]!.id
    const detail = await mockInboxService.assign({
      conversationId: id,
      employeeId: "employee-sara" as EmployeeId,
      teamId: "team-admissions" as TeamId,
    })
    expect(detail.assignmentHistory).toHaveLength(1)
    expect(detail.assignmentHistory[0]?.next.employeeId).toBe("employee-sara")
  })
  it("archives and restores while remaining discoverable in archived view", async () => {
    const id = (await mockInboxService.list(defaultInboxQuery)).items[0]!.id
    expect((await mockInboxService.archive(id)).status).toBe("archived")
    expect(
      (
        await mockInboxService.list({ ...defaultInboxQuery, view: "archived" })
      ).items.some((item) => item.id === id)
    ).toBe(true)
    expect((await mockInboxService.restore(id)).status).not.toBe("archived")
  })
})
