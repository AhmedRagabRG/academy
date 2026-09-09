import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PipelineScreen } from "@/features/lead-pipeline"
import { mockPipelineService } from "@/features/lead-pipeline/services/mock-pipeline-service"
import { PipelineError } from "@/features/lead-pipeline/services/pipeline-error"
import { CrmTestProviders } from "../contacts/test-helpers"

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
  mockPipelineService.reset()
  feedbackSpies.success.mockClear()
  feedbackSpies.error.mockClear()
})

const renderScreen = () =>
  render(
    <CrmTestProviders>
      <PipelineScreen />
    </CrmTestProviders>
  )

describe("Lead pipeline management", () => {
  it("renders every lead stage with its totals", async () => {
    renderScreen()
    await screen.findByText("يوسف أحمد")

    for (const stage of [
      "غير مسند",
      "فرصة جديدة",
      "تم التواصل",
      "مؤهلة",
      "عرض مرسل",
      "مكتسبة",
      "غير مكتسبة",
    ]) {
      expect(screen.getByRole("heading", { name: stage })).toBeInTheDocument()
    }

    expect(screen.getAllByText("إجمالي القيمة")).toHaveLength(7)
  })

  it("moves a lead to another stage using the accessible stage control", async () => {
    const user = userEvent.setup()
    renderScreen()

    const stageControl = await screen.findByRole("combobox", {
      name: "نقل فرصة يوسف أحمد إلى مرحلة",
    })
    await user.selectOptions(stageControl, "qualified")

    await waitFor(() => {
      const qualifiedColumn = screen
        .getByRole("heading", { name: "مؤهلة" })
        .closest("section")
      expect(qualifiedColumn).not.toBeNull()
      expect(
        within(qualifiedColumn!).getByText("يوسف أحمد")
      ).toBeInTheDocument()
    })
  })

  it("creates an assigned opportunity from an existing contact", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByText("يوسف أحمد")

    await user.click(screen.getByRole("button", { name: "إضافة فرصة" }))
    expect(
      screen.getByRole("heading", { name: "تحويل جهة اتصال إلى فرصة" })
    ).toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole("combobox", { name: "جهة الاتصال" }),
      "contact-salma-adel"
    )
    await user.type(
      screen.getByRole("textbox", { name: "البرنامج أو الاحتياج" }),
      "برنامج المحادثة الإنجليزية"
    )
    await user.selectOptions(
      screen.getByRole("combobox", { name: "المسؤول" }),
      "agent-ahmed"
    )
    await user.click(screen.getByRole("button", { name: "إنشاء الفرصة" }))

    const details = await screen.findByRole("complementary", {
      name: "تفاصيل فرصة سلمى عادل",
    })
    expect(
      within(details).getByText("برنامج المحادثة الإنجليزية")
    ).toBeInTheDocument()
  })

  it("adds a follow-up note and shows it in the selected lead's detail panel immediately", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByText("يوسف أحمد")

    await user.click(
      screen.getByText("يوسف أحمد", { selector: "strong" }).closest("button")!
    )
    const panel = await screen.findByRole("complementary", {
      name: "تفاصيل فرصة يوسف أحمد",
    })
    const textarea = within(panel).getByLabelText("ملاحظة متابعة")
    await user.type(textarea, "اتصلت بالعميل وسيرسل المستندات غدًا")
    await user.click(within(panel).getByRole("button", { name: "إضافة للسجل" }))

    await waitFor(() =>
      expect(
        within(panel).getByText("اتصلت بالعميل وسيرسل المستندات غدًا")
      ).toBeInTheDocument()
    )
    expect(feedbackSpies.success).toHaveBeenCalledWith("تمت إضافة المتابعة")
    expect(textarea).toHaveValue("")
  })

  it("keeps the note text and does not show a success toast on a rejected save", async () => {
    const user = userEvent.setup()
    vi.spyOn(mockPipelineService, "addNote").mockRejectedValueOnce(
      new PipelineError("UNAVAILABLE", "تعذر حفظ المتابعة", undefined, true)
    )
    renderScreen()
    await screen.findByText("يوسف أحمد")

    await user.click(
      screen.getByText("يوسف أحمد", { selector: "strong" }).closest("button")!
    )
    const panel = await screen.findByRole("complementary", {
      name: "تفاصيل فرصة يوسف أحمد",
    })
    const textarea = within(panel).getByLabelText("ملاحظة متابعة")
    await user.type(textarea, "متابعة لن تُحفظ")
    await user.click(within(panel).getByRole("button", { name: "إضافة للسجل" }))

    await waitFor(() =>
      expect(feedbackSpies.error).toHaveBeenCalledWith("تعذر حفظ المتابعة")
    )
    expect(feedbackSpies.success).not.toHaveBeenCalled()
    expect(textarea).toHaveValue("متابعة لن تُحفظ")
    expect(
      within(panel).queryByText("متابعة لن تُحفظ", { selector: "p" })
    ).not.toBeInTheDocument()
  })

  it("does not send a second request while a note save is already pending", async () => {
    const user = userEvent.setup()
    let releaseSave: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseSave = resolve
    })
    const originalAddNote = mockPipelineService.addNote
    const spy = vi
      .spyOn(mockPipelineService, "addNote")
      .mockImplementation(async (leadId, note) => {
        await gate
        return originalAddNote(leadId, note)
      })
    renderScreen()
    await screen.findByText("يوسف أحمد")

    await user.click(
      screen.getByText("يوسف أحمد", { selector: "strong" }).closest("button")!
    )
    const panel = await screen.findByRole("complementary", {
      name: "تفاصيل فرصة يوسف أحمد",
    })
    const textarea = within(panel).getByLabelText("ملاحظة متابعة")
    const button = within(panel).getByRole("button", { name: "إضافة للسجل" })
    await user.type(textarea, "متابعة سريعة")
    await user.click(button)

    expect(button).toBeDisabled()
    await user.click(button)
    expect(spy).toHaveBeenCalledTimes(1)

    releaseSave()

    await waitFor(() => expect(textarea).not.toBeDisabled())
    expect(button).toBeDisabled()
    expect(textarea).toHaveValue("")
    expect(within(panel).getByText("متابعة سريعة")).toBeInTheDocument()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
