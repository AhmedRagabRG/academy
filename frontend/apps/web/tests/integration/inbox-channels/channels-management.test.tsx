import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ChannelsScreen } from "@/features/inbox-channels"
import { mockChannelsService } from "@/features/inbox-channels/services/mock-channels-service"
import { CrmTestProviders } from "../contacts/test-helpers"

vi.mock("@/shared/hooks/use-permission", () => ({
  usePermission: () => true,
}))

vi.mock("@/shared/components/feedback/toast", () => ({
  feedback: { success: vi.fn(), error: vi.fn() },
}))

afterEach(cleanup)

const renderScreen = () =>
  render(
    <CrmTestProviders>
      <ChannelsScreen />
    </CrmTestProviders>
  )

describe("Inbox channel linking", () => {
  it("lists linked accounts and the channels still on server credentials", async () => {
    renderScreen()

    expect(await screen.findByText("أكاديمية السلام")).toBeInTheDocument()
    expect(screen.getByText("+20 10 5555 0000")).toBeInTheDocument()
    expect(screen.getByText("مرتبطة")).toBeInTheDocument()
    expect(screen.getByText("تعمل بإعدادات الخادم")).toBeInTheDocument()
    expect(screen.getByText("غير مرتبطة")).toBeInTheDocument()
  })

  it("links an Instagram account through the OAuth asset picker", async () => {
    const user = userEvent.setup()
    const connect = vi.spyOn(mockChannelsService, "connect")
    renderScreen()
    await screen.findByText("أكاديمية السلام")

    await user.selectOptions(
      screen.getByRole("combobox", { name: "القناة" }),
      "instagram"
    )
    await user.type(
      screen.getByRole("textbox", { name: /رمز وصول المستخدم/ }),
      "EAA-user-token"
    )
    await user.click(
      screen.getByRole("button", { name: "جلب الحسابات المتاحة" })
    )

    const account = await screen.findByRole("combobox", { name: "الحساب" })
    await user.selectOptions(account, "instagram-demo-1")
    await user.click(screen.getByRole("button", { name: "ربط الحساب" }))

    await waitFor(() =>
      expect(connect).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "instagram",
          providerAccountId: "instagram-demo-1",
          sessionId: "mock-session",
        })
      )
    )
    connect.mockRestore()
  })

  it("links a WhatsApp number from a pasted system-user token", async () => {
    const user = userEvent.setup()
    const connect = vi.spyOn(mockChannelsService, "connect")
    renderScreen()
    await screen.findByText("أكاديمية السلام")

    await user.click(screen.getByRole("tab", { name: "برمز وصول جاهز" }))
    await user.type(
      screen.getByRole("textbox", { name: /معرّف الحساب لدى المزوّد/ }),
      "123456789"
    )
    await user.type(
      screen.getByRole("textbox", { name: "رمز الوصول" }),
      "EAA-system-token"
    )
    await user.click(screen.getByRole("button", { name: "ربط الحساب" }))

    await waitFor(() =>
      expect(connect).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "whatsapp",
          providerAccountId: "123456789",
          accessToken: "EAA-system-token",
        })
      )
    )
    connect.mockRestore()
  })
})
