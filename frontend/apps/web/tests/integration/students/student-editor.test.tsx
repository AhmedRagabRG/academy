import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StudentFormErrorSummary } from "@/features/students/components/student-form-error-summary"
import { StudentProtectedFields } from "@/features/students/forms/student-protected-fields"
import type { StudentSystemInfo } from "@/features/students/types/domain"

afterEach(cleanup)

const system: StudentSystemInfo = {
  admissionId: "admission-1",
  admissionReference: "ADM-00001",
  approvalSnapshotId: "approval-1",
  admissionDate: "2026-01-05T09:00:00.000Z",
  enrollmentDate: "2026-01-12T09:00:00.000Z",
}

describe("protected system fields", () => {
  it("renders admission-derived facts as read-only text, not editable inputs", () => {
    render(
      <StudentProtectedFields studentCode="STD-2026-00001" system={system} />
    )

    expect(screen.getByText("STD-2026-00001")).toBeInTheDocument()
    expect(screen.getByText("ADM-00001")).toBeInTheDocument()
    expect(screen.queryAllByRole("textbox")).toEqual([])
    expect(screen.queryAllByRole("combobox")).toEqual([])
  })

  it("explains why the values cannot be edited here", () => {
    render(
      <StudentProtectedFields studentCode="STD-2026-00001" system={system} />
    )
    expect(
      screen.getByText(/مصدرها طلب القبول المعتمد ولا يمكن تعديلها/)
    ).toBeInTheDocument()
  })
})

describe("form error summary", () => {
  const errors = {
    identity: {
      primaryPhone: { type: "custom", message: "صيغة رقم الهاتف غير صحيحة" },
      graduationYear: { type: "custom", message: "سنة التخرج غير متوافقة" },
    },
  }

  it("announces the failure and lists every invalid field", () => {
    render(<StudentFormErrorSummary errors={errors} submitCount={1} />)

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("تعذر الحفظ. راجع 2 من الحقول")
    expect(screen.getByText("صيغة رقم الهاتف غير صحيحة")).toBeInTheDocument()
    expect(screen.getByText("سنة التخرج غير متوافقة")).toBeInTheDocument()
  })

  it("links each message to its field so keyboard users can jump to it", async () => {
    const user = userEvent.setup()
    const input = document.createElement("input")
    input.id = "identity.primaryPhone"
    document.body.append(input)

    render(<StudentFormErrorSummary errors={errors} submitCount={1} />)
    await user.click(screen.getByText("صيغة رقم الهاتف غير صحيحة"))
    expect(document.activeElement).toBe(input)

    input.remove()
  })

  it("renders nothing when the form is valid", () => {
    const { container } = render(
      <StudentFormErrorSummary errors={{}} submitCount={1} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing before the first submit attempt", () => {
    render(<StudentFormErrorSummary errors={{}} submitCount={0} />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
