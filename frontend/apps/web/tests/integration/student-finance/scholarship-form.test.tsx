import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AwardScholarshipDialog } from "@/features/student-finance/components/award-scholarship-dialog"
import { ScholarshipHistory } from "@/features/student-finance/components/scholarship-history"
import { makeMoney } from "@/shared/utils/money"
import type { ScholarshipPolicy } from "@/features/student-finance/types/domain"
import type {
  EnrollmentBalance,
  ScholarshipSummary,
} from "@/features/student-finance/types/projections"

afterEach(cleanup)

const egp = (amount: string) => makeMoney(amount, "EGP", 2)
const policy: ScholarshipPolicy = { maxPercentage: "50", requiresApproval: true }
/** The seeded configuration, which permits covering the whole tuition. */
const openPolicy: ScholarshipPolicy = {
  maxPercentage: "100",
  requiresApproval: true,
}

const enrollments = [
  {
    enrollmentId: "enrollment-1",
    offeringLabel: "برنامج تطوير الويب",
    offeringKind: "professional-program",
    totalFees: egp("18000.00"),
    paidAmount: egp("6000.00"),
    remaining: egp("12000.00"),
    status: "partially-settled",
  },
  {
    enrollmentId: "enrollment-2",
    offeringLabel: "دورة اللغة الإنجليزية",
    offeringKind: "training-course",
    totalFees: egp("3500.00"),
    paidAmount: egp("0.00"),
    remaining: egp("3500.00"),
    status: "outstanding",
  },
] as unknown as EnrollmentBalance[]

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof AwardScholarshipDialog>> = {}
) {
  const onConfirm = overrides.onConfirm ?? vi.fn()
  render(
    <AwardScholarshipDialog
      open
      pending={false}
      totalFees={egp("21500.00")}
      policy={policy}
      enrollments={enrollments}
      onClose={vi.fn()}
      {...overrides}
      onConfirm={onConfirm}
    />
  )
  return onConfirm
}

const fillIdentity = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/اسم المنحة/), "منحة التفوق")
  await user.type(screen.getByLabelText(/^السبب/), "تفوق دراسي")
}

describe("coverage drives the form", () => {
  it("starts on partial coverage with a value field", () => {
    renderDialog()
    expect(screen.getByLabelText(/جزء من المصروفات/)).toBeChecked()
    expect(screen.getByLabelText(/القيمة/)).toBeInTheDocument()
  })

  it("replaces the value field with an explanation for full coverage", async () => {
    const user = userEvent.setup()
    renderDialog({ policy: openPolicy })
    await user.click(screen.getByLabelText(/المصروفات كاملة/))

    // No dead control that would have no effect on a full-tuition award.
    expect(screen.queryByLabelText(/القيمة/)).not.toBeInTheDocument()
    expect(screen.getByRole("note")).toHaveTextContent(/المبلغ المحصّل/)
  })

  it("submits full coverage without requiring a figure", async () => {
    const user = userEvent.setup()
    const onConfirm = renderDialog({ policy: openPolicy })
    await fillIdentity(user)
    await user.click(screen.getByLabelText(/المصروفات كاملة/))
    await user.click(screen.getByRole("button", { name: /منح دراسية جديدة/ }))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        coverage: "full-tuition",
        kind: "percentage",
        value: "100",
        name: "منحة التفوق",
      })
    )
  })
})

describe("limits are visible and enforced", () => {
  it("marks full coverage unavailable when the cap is below one hundred", () => {
    renderDialog()
    // Offering a control that could only ever be refused would be a dead end.
    expect(screen.getByLabelText(/المصروفات كاملة/)).toBeDisabled()
    expect(screen.getByText(/التغطية الكاملة غير متاحة/)).toBeInTheDocument()
  })

  it("offers full coverage when the configuration permits it", () => {
    renderDialog({ policy: openPolicy })
    expect(screen.getByLabelText(/المصروفات كاملة/)).toBeEnabled()
  })

  it("names the configured maximum in the value label", () => {
    renderDialog()
    expect(screen.getByLabelText(/الحد الأقصى المسموح به/)).toBeInTheDocument()
    expect(screen.getAllByText(/50%/).length).toBeGreaterThan(0)
  })

  it("refuses a percentage above the configured maximum", async () => {
    const user = userEvent.setup()
    const onConfirm = renderDialog()
    await fillIdentity(user)
    await user.type(screen.getByLabelText(/القيمة/), "80")
    await user.click(screen.getByRole("button", { name: /منح دراسية جديدة/ }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/50/)
  })

  it("does not refuse an award the service would clamp per invoice", async () => {
    // The floor is applied per invoice by the service, which clamps rather than
    // refusing. A form-level aggregate check would block a legitimate award.
    const user = userEvent.setup()
    const onConfirm = renderDialog({ totalFees: egp("10000.00") })
    await fillIdentity(user)
    await user.type(screen.getByLabelText(/القيمة/), "50")
    await user.click(screen.getByRole("button", { name: /منح دراسية جديدة/ }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("requires a name", async () => {
    const user = userEvent.setup()
    const onConfirm = renderDialog()
    await user.type(screen.getByLabelText(/القيمة/), "25")
    await user.type(screen.getByLabelText(/^السبب/), "تفوق دراسي")
    await user.click(screen.getByRole("button", { name: /منح دراسية جديدة/ }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/اسم المنحة/)
  })

  it("requires a reason", async () => {
    const user = userEvent.setup()
    const onConfirm = renderDialog()
    await user.type(screen.getByLabelText(/اسم المنحة/), "منحة التفوق")
    await user.type(screen.getByLabelText(/القيمة/), "25")
    await user.click(screen.getByRole("button", { name: /منح دراسية جديدة/ }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/السبب/)
  })

  it("moves focus to the first invalid field", async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole("button", { name: /منح دراسية جديدة/ }))
    expect(screen.getByLabelText(/اسم المنحة/)).toHaveFocus()
  })
})

describe("scope", () => {
  it("offers every enrollment plus an all-enrollments option", () => {
    renderDialog()
    const scope = screen.getByLabelText(/نطاق التطبيق/)
    expect(scope).toHaveValue("")
    expect(screen.getByRole("option", { name: /كل التسجيلات/ })).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "برنامج تطوير الويب" })
    ).toBeInTheDocument()
  })

  it("omits the scope control when there is only one enrollment", () => {
    renderDialog({ enrollments: [enrollments[0]!] })
    expect(screen.queryByLabelText(/نطاق التطبيق/)).not.toBeInTheDocument()
  })

  it("submits the chosen enrollment", async () => {
    const user = userEvent.setup()
    const onConfirm = renderDialog()
    await fillIdentity(user)
    await user.type(screen.getByLabelText(/القيمة/), "25")
    await user.selectOptions(screen.getByLabelText(/نطاق التطبيق/), "enrollment-2")
    await user.click(screen.getByRole("button", { name: /منح دراسية جديدة/ }))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: "enrollment-2", value: "25" })
    )
  })
})

describe("history", () => {
  const summaries = [
    {
      id: "scholarship-1",
      name: "منحة التفوق",
      value: "25",
      kind: "percentage",
      coverage: "partial-tuition",
      approvedByName: "مدير مالي",
      approvedAt: "2026-03-01T09:00:00.000Z",
    },
    {
      id: "scholarship-2",
      name: "منحة كاملة",
      value: "100",
      kind: "percentage",
      coverage: "full-tuition",
      approvedByName: "مدير تنفيذي",
      approvedAt: "2026-04-01T09:00:00.000Z",
    },
  ] as unknown as ScholarshipSummary[]

  it("shows an empty state rather than a blank panel", () => {
    render(<ScholarshipHistory scholarships={[]} />)
    expect(screen.getByText(/لا توجد منح دراسية/)).toBeInTheDocument()
  })

  it("names the coverage instead of leaving 100% to be interpreted", () => {
    render(<ScholarshipHistory scholarships={summaries} />)
    expect(screen.getByText(/المصروفات كاملة/)).toBeInTheDocument()
    expect(screen.getByText("25%")).toBeInTheDocument()
  })

  it("shows who approved each award and when", () => {
    render(<ScholarshipHistory scholarships={summaries} />)
    expect(screen.getByText(/مدير مالي/)).toBeInTheDocument()
    expect(screen.getByText(/مدير تنفيذي/)).toBeInTheDocument()
  })
})
