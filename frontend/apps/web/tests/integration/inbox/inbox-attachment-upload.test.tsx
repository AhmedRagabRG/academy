import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MessageComposer } from "@/features/inbox/components/message-composer"
import type { ConversationId } from "@/features/inbox/types/common"

const conversationId = "conversation-upload" as ConversationId
const service = vi.hoisted(() => ({
  stageAttachment: vi.fn(),
  sendReply: vi.fn(),
}))
vi.mock("@/features/inbox/services/active-inbox-service", () => ({
  inboxService: service,
}))

function renderComposer() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MessageComposer conversationId={conversationId} allowed />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  service.stageAttachment.mockReset()
  service.sendReply.mockReset()
})
afterEach(cleanup)

describe("Inbox staged attachment flow", () => {
  it("uploads browser bytes, blocks send while pending, then keeps the server descriptor", async () => {
    let resolveUpload!: (value: { id: string; kind: "pdf"; fileName: string; sizeBytes: number }) => void
    service.stageAttachment.mockImplementation(
      () => new Promise((resolve) => { resolveUpload = resolve })
    )
    const send = service.sendReply.mockResolvedValue({ id: conversationId } as never)
    const { container } = renderComposer()
    const file = new File(["actual bytes"], "proof.pdf", { type: "application/pdf" })
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } })
    expect(service.stageAttachment).toHaveBeenCalledWith(file, expect.any(AbortSignal))
    expect(await screen.findByText("جارٍ الرفع")).toBeVisible()
    expect(screen.getByRole("button", { name: "إرسال الرسالة" })).toBeDisabled()
    resolveUpload({ id: "server-staged-id", kind: "pdf", fileName: "proof.pdf", sizeBytes: file.size })
    await waitFor(() => expect(screen.getByText("تم رفع الملف")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "إرسال الرسالة" }))
    await waitFor(() => expect(send).toHaveBeenCalled())
    expect(send.mock.calls[0]![0].attachments).toEqual([
      { id: "server-staged-id", kind: "pdf", fileName: "proof.pdf", sizeBytes: file.size },
    ])
  })

  it("announces upload errors and does not add an invented descriptor", async () => {
    service.stageAttachment.mockRejectedValue(new Error("فشل الرفع"))
    const { container } = renderComposer()
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["x"], "proof.pdf", { type: "application/pdf" })] },
    })
    expect(await screen.findByRole("alert")).toHaveTextContent("فشل الرفع")
    fireEvent.click(screen.getByRole("button", { name: "إرسال الرسالة" }))
    expect(service.sendReply).not.toHaveBeenCalled()
  })
})
