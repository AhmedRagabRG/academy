import { beforeEach, describe, expect, it } from "vitest"
import { useInboxWorkspaceStore } from "@/features/inbox/stores/inbox-workspace-store"
import type { ConversationId } from "@/features/inbox/types/common"

describe("Inbox workspace state", () => {
  beforeEach(() => useInboxWorkspaceStore.getState().reset())
  it("keeps only UI coordination and preserves drafts by conversation", () => {
    const id = "conversation-1" as ConversationId
    useInboxWorkspaceStore.getState().select(id)
    useInboxWorkspaceStore.getState().setDraft(id, "مسودة")
    expect(useInboxWorkspaceStore.getState().mobilePane).toBe("conversation")
    expect(useInboxWorkspaceStore.getState().drafts[id]).toBe("مسودة")
    expect(useInboxWorkspaceStore.getState()).not.toHaveProperty(
      "conversations"
    )
  })
})
