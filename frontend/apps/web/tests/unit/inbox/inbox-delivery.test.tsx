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
          authorType: "human-agent",
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
  it("identifies AI drafts and explains suppressed delivery", () => {
    render(
      <MessageBubble
        message={{
          id: "ai-message" as never,
          conversationId: "conversation" as never,
          direction: "outgoing",
          authorType: "ai-agent",
          senderName: "المساعد الذكي",
          body: "مسودة رد",
          sentAt: "2026-08-10T08:00:00.000Z",
          delivery: "suppressed",
          attachments: [],
        } satisfies Message}
      />
    )
    expect(screen.getByText("الذكاء الاصطناعي")).toBeVisible()
    expect(screen.getByText("مسودة رد")).toHaveClass("line-through")
    expect(
      screen.getByText(
        "مسودة الذكاء الاصطناعي — تم إيقافها لأن موظفًا رد أولًا"
      )
    ).toBeVisible()
    expect(screen.getByText("تم إيقافها")).toBeVisible()
  })
})
