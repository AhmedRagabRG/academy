import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import { InternalNotesPanel } from "@/features/inbox/components/internal-notes-panel"
import { mockInboxService } from "@/features/inbox/services/mock-inbox-service"
import { defaultInboxQuery } from "@/features/inbox/stores/inbox-workspace-store"

describe("Inbox notes integration", () => {
  it("labels notes as employee-only", async () => {
    const detail = await mockInboxService.detail(
      (await mockInboxService.list(defaultInboxQuery)).items[0]!.id
    )
    render(
      <QueryClientProvider client={new QueryClient()}>
        <InternalNotesPanel conversation={detail} allowed={false} />
      </QueryClientProvider>
    )
    expect(screen.getByText(/لن يراها العميل/)).toBeVisible()
  })
})
