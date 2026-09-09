import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ContactsScreen } from "@/features/contacts"
import { mockContactsService } from "@/features/contacts/services/mock-contacts-service"
import { ContactsError } from "@/features/contacts/services/contacts-error"
import { CrmTestProviders } from "./test-helpers"

vi.mock("@/shared/hooks/use-permission", () => ({
  usePermission: () => true,
}))

const feedbackSpies = { success: vi.fn(), error: vi.fn() }
vi.mock("@/shared/components/feedback/toast", () => ({
  feedback: {
    success: (message: string) => feedbackSpies.success(message),
    error: (message: string) => feedbackSpies.error(message),
  },
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  mockContactsService.reset()
  feedbackSpies.success.mockClear()
  feedbackSpies.error.mockClear()
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

  it("adds a note and shows it in the selected contact's detail panel immediately", async () => {
    const user = userEvent.setup()
    renderScreen()

    const panel = await screen.findByRole("complementary", {
      name: "تفاصيل مريم خالد",
    })
    const textarea = within(panel).getByLabelText("ملاحظة جديدة")
    await user.type(textarea, "تابعت العميلة هاتفيًا وستؤكد الموعد غدًا")
    await user.click(within(panel).getByRole("button", { name: "إضافة ملاحظة" }))

    await waitFor(() =>
      expect(
        within(panel).getByText("تابعت العميلة هاتفيًا وستؤكد الموعد غدًا")
      ).toBeInTheDocument()
    )
    expect(feedbackSpies.success).toHaveBeenCalledWith("تمت إضافة الملاحظة")
    expect(within(panel).getByText("2")).toBeInTheDocument()
    expect(textarea).toHaveValue("")
  })

  it("keeps the note text and does not show a success toast on a rejected save", async () => {
    const user = userEvent.setup()
    vi.spyOn(mockContactsService, "addNote").mockRejectedValueOnce(
      new ContactsError("UNAVAILABLE", "تعذر حفظ الملاحظة", undefined, true)
    )
    renderScreen()

    const panel = await screen.findByRole("complementary", {
      name: "تفاصيل مريم خالد",
    })
    const textarea = within(panel).getByLabelText("ملاحظة جديدة")
    await user.type(textarea, "ملاحظة لن تُحفظ")
    await user.click(within(panel).getByRole("button", { name: "إضافة ملاحظة" }))

    await waitFor(() =>
      expect(feedbackSpies.error).toHaveBeenCalledWith("تعذر حفظ الملاحظة")
    )
    expect(feedbackSpies.success).not.toHaveBeenCalled()
    expect(textarea).toHaveValue("ملاحظة لن تُحفظ")
    expect(
      within(panel).queryByText("ملاحظة لن تُحفظ", { selector: "p" })
    ).not.toBeInTheDocument()
    expect(within(panel).getByText("1")).toBeInTheDocument()
  })

  it("does not send a second request while a note save is already pending", async () => {
    const user = userEvent.setup()
    let releaseSave: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseSave = resolve
    })
    const originalAddNote = mockContactsService.addNote
    const spy = vi
      .spyOn(mockContactsService, "addNote")
      .mockImplementation(async (id, content) => {
        await gate
        return originalAddNote(id, content)
      })
    renderScreen()

    const panel = await screen.findByRole("complementary", {
      name: "تفاصيل مريم خالد",
    })
    const textarea = within(panel).getByLabelText("ملاحظة جديدة")
    const button = within(panel).getByRole("button", { name: "إضافة ملاحظة" })
    await user.type(textarea, "ملاحظة سريعة")
    await user.click(button)

    expect(button).toBeDisabled()
    await user.click(button)
    expect(spy).toHaveBeenCalledTimes(1)

    releaseSave()

    await waitFor(() => expect(textarea).not.toBeDisabled())
    expect(button).toBeDisabled()
    expect(textarea).toHaveValue("")
    expect(within(panel).getByText("ملاحظة سريعة")).toBeInTheDocument()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
