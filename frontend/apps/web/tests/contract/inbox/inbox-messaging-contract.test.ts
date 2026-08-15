import { beforeEach, describe, expect, it } from "vitest"
import { mockInboxService } from "@/features/inbox/services/mock-inbox-service"
import { defaultInboxQuery } from "@/features/inbox/stores/inbox-workspace-store"
import type { EmployeeId } from "@/features/inbox/types/common"

describe("Inbox messaging contract", () => {
  beforeEach(() => mockInboxService.reset())
  it("sends one message for an idempotent retry token", async () => {
    const id = (await mockInboxService.list(defaultInboxQuery)).items[0]!.id
    const before = await mockInboxService.detail(id)
    const command = {
      conversationId: id,
      body: "رسالة اختبار",
      attachments: [],
      retryToken: "retry-1",
    }
    await mockInboxService.sendReply(command)
    const after = await mockInboxService.sendReply(command)
    expect(after.messages).toHaveLength(before.messages.length + 1)
    expect(after.lastMessage).toBe("رسالة اختبار")
  })
  it("rejects empty replies", async () => {
    const id = (await mockInboxService.list(defaultInboxQuery)).items[0]!.id
    await expect(
      mockInboxService.sendReply({
        conversationId: id,
        body: " ",
        attachments: [],
        retryToken: "empty",
      })
    ).rejects.toThrow("اكتب رسالة")
  })

  it("enforces reply permission inside the service", async () => {
    const id = (await mockInboxService.list(defaultInboxQuery)).items[0]!.id
    mockInboxService.setActor("employee-sara" as EmployeeId)
    const visibleId = (await mockInboxService.list(defaultInboxQuery)).items[0]!
      .id
    mockInboxService.setActor("employee-no-access" as EmployeeId)
    await expect(
      mockInboxService.sendReply({
        conversationId: visibleId ?? id,
        body: "غير مصرح",
        attachments: [],
        retryToken: "denied",
      })
    ).rejects.toThrow("صلاحية")
  })
})
