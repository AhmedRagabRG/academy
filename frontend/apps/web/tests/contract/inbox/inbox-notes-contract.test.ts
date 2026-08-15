import { beforeEach, describe, expect, it } from "vitest"
import { mockInboxService } from "@/features/inbox/services/mock-inbox-service"
import { defaultInboxQuery } from "@/features/inbox/stores/inbox-workspace-store"
import type { EmployeeId } from "@/features/inbox/types/common"

describe("Inbox notes contract", () => {
  beforeEach(() => mockInboxService.reset())
  it("keeps notes outside customer-visible messages and author-protects edits", async () => {
    const id = (await mockInboxService.list(defaultInboxQuery)).items[0]!.id
    const before = await mockInboxService.detail(id)
    const note = await mockInboxService.addNote(id, "معلومة داخلية")
    expect((await mockInboxService.detail(id)).messages).toHaveLength(
      before.messages.length
    )
    mockInboxService.setActor("employee-sara" as EmployeeId)
    await expect(
      mockInboxService.editNote(id, note.id, "تعديل غير مصرح")
    ).rejects.toThrow("ملاحظاتك فقط")
  })
})
