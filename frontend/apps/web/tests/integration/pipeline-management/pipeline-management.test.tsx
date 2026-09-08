import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PipelineManagementScreen } from "@/features/pipeline-management"
import { mockPipelineAdminService } from "@/features/pipeline-management/services/mock-pipeline-admin-service"
import { PipelineAdminError } from "@/features/pipeline-management/services/pipeline-admin-error"
import { CrmTestProviders } from "../contacts/test-helpers"

vi.mock("@/shared/hooks/use-permission", () => ({
  usePermission: () => true,
}))

const toastSpies = { success: vi.fn(), error: vi.fn() }
vi.mock("@/shared/components/feedback/toast", () => ({
  feedback: {
    success: (message: string) => toastSpies.success(message),
    error: (message: string) => toastSpies.error(message),
  },
}))

afterEach(() => {
  cleanup()
  mockPipelineAdminService.reset()
  vi.restoreAllMocks()
  toastSpies.success.mockClear()
  toastSpies.error.mockClear()
})

const renderScreen = () =>
  render(
    <CrmTestProviders>
      <PipelineManagementScreen />
    </CrmTestProviders>
  )

const stageList = () => screen.getByRole("list", { name: "مراحل المسار" })
const stageNames = () =>
  within(stageList())
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "")

describe("Pipeline management route", () => {
  it("lists every pipeline including archived state and lead counts", async () => {
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    expect(
      screen.getByRole("button", { name: /مسار الحسابات المؤسسية/ })
    ).toBeInTheDocument()
    const seasonal = screen.getByRole("button", {
      name: /مسار العروض الموسمية/,
    })
    expect(within(seasonal).getByText("مؤرشف")).toBeInTheDocument()
    expect(within(seasonal).getByText("0 فرصة")).toBeInTheDocument()
  })

  it("selects another pipeline and renders its own stages", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    await user.click(
      screen.getByRole("button", { name: /مسار الحسابات المؤسسية/ })
    )

    await screen.findByRole("heading", { name: "مسار الحسابات المؤسسية" })
    expect(screen.getByText("مراجعة العقد")).toBeInTheDocument()
    expect(screen.getByText("استقبال")).toBeInTheDocument()
  })

  it("creates a pipeline and selects it", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    await user.click(screen.getByRole("button", { name: "مسار جديد" }))
    await user.type(screen.getByLabelText("الرمز"), "referrals")
    await user.type(screen.getByLabelText("الاسم"), "مسار الإحالات")
    await user.click(screen.getByRole("button", { name: "إنشاء المسار" }))

    await screen.findByRole("heading", { name: "مسار الإحالات" })
    expect(toastSpies.success).toHaveBeenCalledWith("تم إنشاء المسار")
    expect(
      screen.getByText("لا توجد مراحل في هذا المسار بعد.")
    ).toBeInTheDocument()
  })

  it("renames the selected pipeline", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    await user.click(screen.getByRole("button", { name: "تعديل اسم المسار" }))
    const field = screen.getByLabelText("اسم المسار")
    await user.clear(field)
    await user.type(field, "مسار القبول المطوّر")
    await user.click(screen.getByRole("button", { name: "حفظ الاسم" }))

    await screen.findByRole("heading", { name: "مسار القبول المطوّر" })
    expect(toastSpies.success).toHaveBeenCalledWith("تم حفظ اسم المسار")
  })

  it("makes a non-default pipeline the default", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    await user.click(
      screen.getByRole("button", { name: /مسار الحسابات المؤسسية/ })
    )
    await screen.findByRole("heading", { name: "مسار الحسابات المؤسسية" })
    await user.click(screen.getByRole("button", { name: "اجعله افتراضيًا" }))

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "اجعله افتراضيًا" })
      ).not.toBeInTheDocument()
    })
    expect(toastSpies.success).toHaveBeenCalledWith(
      "أصبح هذا المسار هو الافتراضي"
    )
  })

  it("archives then restores a non-default pipeline through a confirmation dialog", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    await user.click(
      screen.getByRole("button", { name: /مسار الحسابات المؤسسية/ })
    )
    await screen.findByRole("heading", { name: "مسار الحسابات المؤسسية" })

    await user.click(screen.getByRole("button", { name: "أرشفة" }))
    const archiveDialog = await screen.findByRole("dialog")
    await user.click(
      within(archiveDialog).getByRole("button", { name: "أرشفة" })
    )

    await screen.findByRole("button", { name: "استعادة" })
    expect(toastSpies.success).toHaveBeenCalledWith("تمت أرشفة المسار")

    await user.click(screen.getByRole("button", { name: "استعادة" }))
    await screen.findByRole("button", { name: "أرشفة" })
    expect(toastSpies.success).toHaveBeenCalledWith("تمت استعادة المسار")
  })

  it("disables deleting a pipeline that still holds leads", async () => {
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })
    expect(screen.getByRole("button", { name: "حذف" })).toBeDisabled()
  })

  it("deletes a pipeline that holds no leads through a confirmation dialog", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    await user.click(
      screen.getByRole("button", { name: /مسار الحسابات المؤسسية/ })
    )
    await screen.findByRole("heading", { name: "مسار الحسابات المؤسسية" })

    await user.click(screen.getByRole("button", { name: "حذف" }))
    const deleteDialog = await screen.findByRole("dialog")
    await user.click(within(deleteDialog).getByRole("button", { name: "حذف" }))

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /مسار الحسابات المؤسسية/ })
      ).not.toBeInTheDocument()
    })
    expect(toastSpies.success).toHaveBeenCalledWith("تم حذف المسار")
  })

  it("creates a stage as the new entry point, clearing the previous one", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    await user.click(
      screen.getByRole("button", { name: /مسار الحسابات المؤسسية/ })
    )
    await screen.findByRole("heading", { name: "مسار الحسابات المؤسسية" })

    await user.click(screen.getByRole("button", { name: "مرحلة جديدة" }))
    await user.type(screen.getByLabelText("الرمز"), "priority")
    await user.type(screen.getByLabelText("الاسم"), "مراجعة عاجلة")
    await user.click(screen.getByRole("checkbox", { name: "نقطة دخول المسار" }))
    await user.click(screen.getByRole("button", { name: "إضافة المرحلة" }))

    await screen.findByText("مراجعة عاجلة")
    const entryBadges = within(stageList()).getAllByText("نقطة دخول")
    expect(entryBadges).toHaveLength(1)
    expect(
      within(stageList()).getByText("مراجعة عاجلة").closest("li")
    ).toContainElement(entryBadges[0]!)
  })

  it("edits a stage's name", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    await user.click(screen.getByRole("button", { name: "تعديل «تم التواصل»" }))
    const nameField = await screen.findByLabelText("الاسم")
    await user.clear(nameField)
    await user.type(nameField, "بانتظار الرد")
    await user.click(screen.getByRole("button", { name: "حفظ التعديلات" }))

    await screen.findByText("بانتظار الرد")
    expect(toastSpies.success).toHaveBeenCalledWith("تم حفظ المرحلة")
  })

  it("refuses to archive the entry stage in the UI", async () => {
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    const archiveButton = screen.getByRole("button", {
      name: "أرشفة «استقبال»",
    })
    expect(archiveButton).toBeDisabled()
    expect(archiveButton).toHaveAttribute(
      "title",
      "لا يمكن أرشفة مرحلة نقطة الدخول"
    )
  })

  it("reorders stages with move-down and settles on the new order", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    expect(stageNames()[0]).toContain("استقبال")

    await user.click(
      screen.getByRole("button", { name: "تحريك «استقبال» للأسفل" })
    )

    await waitFor(() => expect(stageNames()[1]).toContain("استقبال"))
    expect(toastSpies.error).not.toHaveBeenCalled()
  })

  it("rolls back an optimistic reorder and refetches when the request fails", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("heading", { name: "مسار القبول والمبيعات" })

    const failure = new PipelineAdminError(
      "CONFLICT",
      "تم تعديل هذا السجل بواسطة موظف آخر. حدّث الصفحة ثم أعد المحاولة."
    )
    vi.spyOn(mockPipelineAdminService, "reorderStages").mockRejectedValueOnce(
      failure
    )

    await user.click(
      screen.getByRole("button", { name: "تحريك «استقبال» للأسفل" })
    )

    await waitFor(() =>
      expect(toastSpies.error).toHaveBeenCalledWith(failure.message)
    )
    await waitFor(() => expect(stageNames()[0]).toContain("استقبال"))
  })
})
