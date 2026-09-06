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
})
