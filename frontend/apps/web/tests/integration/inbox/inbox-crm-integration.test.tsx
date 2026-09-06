import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ConversationCrmPanel } from "@/features/inbox/components/conversation-crm-panel"
import { mockInboxService } from "@/features/inbox/services/mock-inbox-service"
import type { ConversationId } from "@/features/inbox/types/common"
import { mockPipelineService } from "@/features/lead-pipeline/services/mock-pipeline-service"
import { CrmTestProviders } from "../contacts/test-helpers"

vi.mock("@/shared/hooks/use-permission", () => ({
  usePermission: () => true,
}))

vi.mock("@/shared/components/feedback/toast", () => ({
  feedback: { success: vi.fn(), error: vi.fn() },
}))

afterEach(() => {
  cleanup()
  mockPipelineService.reset()
})

const open = async (id: string) => {
  const conversation = await mockInboxService.detail(id as ConversationId)
  render(
    <CrmTestProviders>
      <ConversationCrmPanel conversation={conversation} />
    </CrmTestProviders>
  )
  return conversation
}

describe("Inbox CRM integration", () => {
  it("shows the linked lead stage and moves it through the pipeline", async () => {
    const user = userEvent.setup()
    await open("conversation-1")

    const stage = await screen.findByRole("combobox", {
      name: "مرحلة فرصة مريم خالد",
    })
    await waitFor(() => expect(stage).toHaveValue("qualified"))

    await user.selectOptions(stage, "proposal")

    await waitFor(async () =>
      expect(
        (
          await mockPipelineService.leads({
            search: "",
            agentId: "",
            source: "",
            priority: "",
            outcome: "",
          })
        ).find((lead) => lead.id === "lead-mariam")?.stageId
      ).toBe("proposal")
    )
  })

  it("links to the contact record the API attached to the conversation", async () => {
    await open("conversation-1")

    expect(
      await screen.findByRole("link", { name: /فتح وتعديل جهة الاتصال/ })
    ).toHaveAttribute("href", "/contacts?contact=contact-mariam-khaled&edit=1")
    expect(
      screen.getByRole("link", { name: /عرض الفرصة في المسار/ })
    ).toHaveAttribute("href", "/lead-pipeline?lead=lead-mariam")
  })

  it("says the link is pending for a customer ingestion has not paired yet", async () => {
    await open("conversation-4")

    expect(
      screen.getByText("سيُربط تلقائيًا عند وصول رسالة من القناة")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("combobox", { name: /مرحلة فرصة/ })
    ).not.toBeInTheDocument()
  })
})
