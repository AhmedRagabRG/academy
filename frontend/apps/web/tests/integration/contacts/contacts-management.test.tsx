import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ContactsScreen } from "@/features/contacts"
import { mockContactsService } from "@/features/contacts/services/mock-contacts-service"
import { CrmTestProviders } from "./test-helpers"

vi.mock("@/shared/hooks/use-permission", () => ({
  usePermission: () => true,
}))

vi.mock("@/shared/components/feedback/toast", () => ({
  feedback: { success: vi.fn(), error: vi.fn() },
}))

afterEach(() => {
  cleanup()
  mockContactsService.reset()
})

const renderScreen = () =>
  render(
    <CrmTestProviders>
      <ContactsScreen />
    </CrmTestProviders>
  )

describe("Contacts CRM management", () => {
  it("opens contact creation even when the groups tab is active", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("tab", { name: /المجموعات/ })

    await user.click(screen.getByRole("tab", { name: /المجموعات/ }))
    expect(
      screen.getByRole("heading", { name: "المجموعات" })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "إضافة جهة اتصال" }))

    expect(
      screen.getByRole("heading", { name: "إضافة بيانات التواصل" })
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /جهات الاتصال/ })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  })

  it("adds and removes contacts directly from the selected group", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("tab", { name: /المجموعات/ })

    await user.click(screen.getByRole("tab", { name: /المجموعات/ }))
    await user.click(screen.getByRole("button", { name: "إدارة الأعضاء" }))

    const salma = await screen.findByRole("checkbox", { name: /سلمى عادل/ })
    expect(salma).not.toBeChecked()

    await user.click(salma)
    await waitFor(() => expect(salma).toBeChecked())
    expect(screen.getByText("3 أعضاء")).toBeInTheDocument()

    await user.click(salma)
    await waitFor(() => expect(salma).not.toBeChecked())
    expect(screen.getByText("2 أعضاء")).toBeInTheDocument()
  })

  it("refuses a second contact on a phone number already in the book", async () => {
    const existing = (
      await mockContactsService.list({
        search: "",
        source: "all",
        groupIds: [],
        limit: 50,
      })
    ).items[0]!

    await expect(
      mockContactsService.create({
        name: "نسخة مكررة",
        phone: existing.phone,
        email: "",
        company: "",
        role: "",
      })
    ).rejects.toMatchObject({ code: "DUPLICATE" })
  })

  it("edits the alternate phone and responsible employee shown in details", async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(
      await screen.findByRole("button", { name: "تعديل جهة الاتصال" })
    )

    expect(
      screen.getByRole("heading", { name: "البيانات الأساسية" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("textbox", { name: "هاتف آخر" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "المسؤول" })
    ).toBeInTheDocument()

    await user.clear(screen.getByRole("textbox", { name: "هاتف آخر" }))
    await user.type(
      screen.getByRole("textbox", { name: "هاتف آخر" }),
      "+20 12 3456 7890"
    )
    await user.selectOptions(
      screen.getByRole("combobox", { name: "المسؤول" }),
      "agent-sara"
    )
    await user.click(screen.getByRole("button", { name: "حفظ التعديلات" }))

    await waitFor(() =>
      expect(screen.getByText("+20 12 3456 7890")).toBeInTheDocument()
    )
    expect(screen.getByText("سارة إبراهيم")).toBeInTheDocument()
  })
})
