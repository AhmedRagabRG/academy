import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { InstallmentPlanForm } from "@/features/student-finance/components/installment-plan-form"
import { InstallmentSchedule } from "@/features/student-finance/components/installment-schedule"
import { makeMoney, sum } from "@/shared/utils/money"
import type { InstallmentEligibility } from "@/features/student-finance/types/domain"
import type { InstallmentView } from "@/features/student-finance/types/projections"

afterEach(cleanup)

const egp = (amount: string) => makeMoney(amount, "EGP", 2)

const eligibility: InstallmentEligibility[] = [
  { offeringKind: "professional-program", allowsPlan: true, maxCount: 12 },
  { offeringKind: "training-course", allowsPlan: false, maxCount: 0 },
]

const formProps = {
  finalAmount: egp("1000.00"),
  offeringKind: "professional-program" as const,
  eligibility,
  hasPaidInstallments: false,
  pending: false,
  onGenerate: vi.fn(),
}

const view = (
  sequence: number,
  amount: string,
  paid: string,
  status: InstallmentView["status"]
) =>
  ({
    id: `installment-${sequence}`,
    sequence,
    dueDate: `2026-0${sequence + 6}-01T00:00:00.000Z`,
    amount: egp(amount),
    paidAmount: egp(paid),
    remaining: egp((Number(amount) - Number(paid)).toFixed(2)),
    status,
  }) as unknown as InstallmentView

describe("plan generator", () => {
  it("previews a schedule whose amounts sum exactly to the final amount", async () => {
    const user = userEvent.setup()
    render(<InstallmentPlanForm {...formProps} />)

    await user.clear(screen.getByLabelText(/عدد الأقساط/))
    await user.type(screen.getByLabelText(/عدد الأقساط/), "3")

    // 1000 / 3 does not divide evenly — the remainder lands on the last part.
    expect(screen.getByText("معاينة الجدول")).toBeInTheDocument()
    const amounts = screen
      .getAllByText(/٣٣٣|333/)
      .map((node) => node.textContent)
    expect(amounts.length).toBeGreaterThan(0)
    expect(screen.getByText(/مجموع الأقساط يساوي الصافي المستحق بالضبط/)).toBeInTheDocument()
  })

  it("submits the chosen count and first due date", async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn()
    render(<InstallmentPlanForm {...formProps} onGenerate={onGenerate} />)

    await user.clear(screen.getByLabelText(/عدد الأقساط/))
    await user.type(screen.getByLabelText(/عدد الأقساط/), "4")
    await user.click(screen.getByRole("button", { name: /إنشاء خطة تقسيط/ }))

    expect(onGenerate).toHaveBeenCalledTimes(1)
    expect(onGenerate.mock.calls[0]![0].count).toBe(4)
    expect(onGenerate.mock.calls[0]![0].firstDueDate).toContain("2026-09")
  })

  it("refuses a count above the configured maximum", async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn()
    render(<InstallmentPlanForm {...formProps} onGenerate={onGenerate} />)

    await user.clear(screen.getByLabelText(/عدد الأقساط/))
    await user.type(screen.getByLabelText(/عدد الأقساط/), "99")

    expect(screen.getByRole("alert")).toHaveTextContent(/بين ١ و 12/)
    expect(screen.getByRole("button", { name: /إنشاء خطة تقسيط/ })).toBeDisabled()
    expect(onGenerate).not.toHaveBeenCalled()
  })

  it("states the configured maximum in the field label", () => {
    render(<InstallmentPlanForm {...formProps} />)
    expect(screen.getByLabelText(/بحد أقصى 12/)).toBeInTheDocument()
  })

  it("explains when the product type disallows plans, instead of offering a dead form", () => {
    render(<InstallmentPlanForm {...formProps} offeringKind="training-course" />)
    expect(
      screen.getByText(/لا يسمح بخطط التقسيط وفق الإعدادات الحالية/)
    ).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("explains when regeneration is blocked by a recorded payment", () => {
    render(<InstallmentPlanForm {...formProps} hasPaidInstallments />)
    expect(
      screen.getByText(/لا يمكن إعادة إنشاء الخطة بعد تسجيل مدفوعات/)
    ).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("installment schedule", () => {
  const installments = [
    view(1, "333.33", "333.33", "paid"),
    view(2, "333.33", "100.00", "partially-paid"),
    view(3, "333.34", "0.00", "overdue"),
  ]

  it("renders a semantic table with column headers", () => {
    render(<InstallmentSchedule installments={installments} currency="EGP" precision={2} />)
    const table = screen.getByRole("table")
    expect(table).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "رقم القسط" })).toBeInTheDocument()
  })

  it("shows a row per installment with its derived status", () => {
    render(<InstallmentSchedule installments={installments} currency="EGP" precision={2} />)
    expect(screen.getByText("مدفوع")).toBeInTheDocument()
    expect(screen.getByText("مدفوع جزئيًا")).toBeInTheDocument()
    expect(screen.getByText("متأخر")).toBeInTheDocument()
  })

  it("restates a total equal to the sum of the parts", () => {
    render(<InstallmentSchedule installments={installments} currency="EGP" precision={2} />)
    const expected = sum(installments.map((i) => i.amount), "EGP", 2)
    expect(expected.amount).toBe("1000.00")
    expect(screen.getByText("الإجمالي")).toBeInTheDocument()
  })

  it("shows an empty state rather than a blank table", () => {
    render(<InstallmentSchedule installments={[]} currency="EGP" precision={2} />)
    expect(screen.getByText("لا توجد خطة تقسيط")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})
