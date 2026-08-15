import { beforeEach, describe, expect, it } from "vitest"
import { mockInboxService } from "@/features/inbox/services/mock-inbox-service"
import { defaultInboxQuery } from "@/features/inbox/stores/inbox-workspace-store"
import type { EmployeeId } from "@/features/inbox/types/common"

describe("Inbox read contract", () => {
  beforeEach(() => {
    mockInboxService.reset()
    mockInboxService.setActor("employee-demo" as EmployeeId)
  })
  it("returns stable cursor pages without duplicates", async () => {
    const first = await mockInboxService.list({
      ...defaultInboxQuery,
      limit: 5,
    })
    const second = await mockInboxService.list({
      ...defaultInboxQuery,
      limit: 5,
      cursor: first.nextCursor,
    })
    expect(first.items).toHaveLength(5)
    expect(
      new Set([...first.items, ...second.items].map((item) => item.id)).size
    ).toBe(10)
  })
  it("applies team and no-access scope before results", async () => {
    mockInboxService.setActor("employee-sara" as EmployeeId)
    const team = await mockInboxService.list(defaultInboxQuery)
    expect(
      team.items.every((item) => item.assignedTeamId === "team-admissions")
    ).toBe(true)
    mockInboxService.setActor("employee-no-access" as EmployeeId)
    expect((await mockInboxService.list(defaultInboxQuery)).items).toHaveLength(
      0
    )
  })
})
