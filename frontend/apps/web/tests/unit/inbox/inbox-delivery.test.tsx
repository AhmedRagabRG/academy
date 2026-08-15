import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MessageBubble } from "@/features/inbox/components/message-bubble"
import type { Message } from "@/features/inbox/types/domain"

describe("Inbox delivery presentation", () => {
  it("renders queued delivery honestly in Arabic", () => {
    render(
      <MessageBubble
        message={{
          id: "message" as never,
          conversationId: "conversation" as never,
          direction: "outgoing",
          senderName: "موظف",
          body: "رد",
          sentAt: "2026-08-10T08:00:00.000Z",
          delivery: "queued",
          attachments: [],
        } satisfies Message}
      />
    )
    expect(screen.getByText("في انتظار الإرسال")).toBeVisible()
  })
})
