import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CampaignBuilderScreen } from "@/features/campaigns/screens/campaign-builder-screen"
import type { WhatsappTemplate } from "@/features/campaigns/types/domain"

vi.mock("@/shared/hooks/use-permission", () => ({
  usePermission: () => true,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const template = (
  overrides: Partial<WhatsappTemplate> & Pick<WhatsappTemplate, "id" | "name">
): WhatsappTemplate => ({
  language: "ar",
  category: "MARKETING",
  status: "approved",
  bodyText: "نص افتراضي",
  variableTokens: [],
  headerVariableTokens: [],
  named: false,
  syncedAt: new Date().toISOString(),
  ...overrides,
})

const approvedWelcome = template({
  id: "template-welcome",
  name: "welcome_message",
  bodyText: "أهلًا بك {{1}} في رحلتك معنا",
  variableTokens: ["1"],
})

const approvedReminder = template({
  id: "template-reminder",
  name: "installment_reminder",
  category: "UTILITY",
  bodyText: "نذكرك بقسط {{1}} المستحق {{2}}",
  variableTokens: ["1", "2"],
  headerVariableTokens: ["1"],
})

/** Simulates an adapter that violates the "lookups return approved only" contract. */
const pendingUnderReview = template({
  id: "template-pending",
  name: "summer_courses",
  status: "pending",
  bodyText: "برامج الصيف قيد المراجعة {{1}}",
  variableTokens: ["1"],
})

const lookupsFixture = {
  templates: [approvedWelcome, approvedReminder, pendingUnderReview],
  groups: [],
  customFields: [],
  contactTokens: ["name" as const],
  channel: { linked: true },
  templatesSyncedAt: new Date().toISOString(),
}

const service = vi.hoisted(() => ({ lookups: vi.fn() }))
vi.mock("@/features/campaigns/services/active-campaigns-service", () => ({
  campaignsService: service,
}))

afterEach(() => {
  cleanup()
  service.lookups.mockReset()
})

function renderBuilder() {
  service.lookups.mockResolvedValue(lookupsFixture)
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CampaignBuilderScreen />
    </QueryClientProvider>
  )
}

describe("Campaign template picker", () => {
  it("lists only approved templates, excludes a pending one, switches selection, and never renders every body at once", async () => {
    const user = userEvent.setup()
    renderBuilder()

    const picker = await screen.findByRole("combobox", { name: "اختر القالب" })
    expect(picker).toHaveValue("")

    const options = within(picker).getAllByRole("option")
    const optionLabels = options.map((option) => option.textContent)
    expect(
      optionLabels.some((label) => label?.includes("welcome_message"))
    ).toBe(true)
    expect(
      optionLabels.some((label) => label?.includes("installment_reminder"))
    ).toBe(true)
    expect(
      optionLabels.some((label) => label?.includes("summer_courses"))
    ).toBe(false)
    expect(
      screen.queryByText(pendingUnderReview.bodyText)
    ).not.toBeInTheDocument()

    // Nothing selected yet: no compact preview body is rendered.
    expect(screen.queryByText(approvedWelcome.bodyText)).not.toBeInTheDocument()
    expect(
      screen.queryByText(approvedReminder.bodyText)
    ).not.toBeInTheDocument()

    await user.selectOptions(picker, approvedWelcome.id)
    expect(picker).toHaveValue(approvedWelcome.id)
    expect(screen.getByText(approvedWelcome.bodyText)).toBeInTheDocument()
    expect(
      screen.queryByText(approvedReminder.bodyText)
    ).not.toBeInTheDocument()
    expect(screen.queryByText("متغيرات الترويسة")).not.toBeInTheDocument()
    expect(screen.getAllByRole("combobox", { name: "المصدر" })).toHaveLength(
      approvedWelcome.variableTokens.length
    )

    await user.selectOptions(picker, approvedReminder.id)
    expect(picker).toHaveValue(approvedReminder.id)
    expect(screen.getByText(approvedReminder.bodyText)).toBeInTheDocument()
    expect(screen.queryByText(approvedWelcome.bodyText)).not.toBeInTheDocument()
    expect(screen.getByText("متغيرات الترويسة")).toBeInTheDocument()
    expect(screen.getAllByRole("combobox", { name: "المصدر" })).toHaveLength(
      approvedReminder.variableTokens.length +
        approvedReminder.headerVariableTokens.length
    )
  })
})
