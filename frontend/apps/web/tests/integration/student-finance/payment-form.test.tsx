import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RecordPaymentDialog } from "@/features/student-finance/components/record-payment-dialog"
import { makeMoney } from "@/shared/utils/money"
import type { PaymentMethod } from "@/features/student-finance/types/domain"
import type { InstallmentView } from "@/features/student-finance/types/projections"

afterEach(cleanup)

const egp = (amount: string) => makeMoney(amount, "EGP", 2)

const methods: PaymentMethod[] = [
  { id: "cash", label: "نقدي", active: true },
  { id: "bank-transfer", label: "تحويل بنكي", active: true },
  { id: "legacy-wallet", label: "محفظة قديمة", active: false },
]

const installments = [
  {
    id: "installment-1",
    sequence: 1,
    dueDate: "2026-07-01T00:00:00.000Z",
    amount: egp("250.00"),
    paidAmount: egp("0.00"),
    remaining: egp("250.00"),
    status: "pending",
  },
  {
    id: "installment-2",
    sequence: 2,
    dueDate: "2026-08-01T00:00:00.000Z",
    amount: egp("250.00"),
    paidAmount: egp("250.00"),
    remaining: egp("0.00"),
    status: "paid",
  },
] as unknown as InstallmentView[]

const props = {
  open: true,
  pending: false,
  currency: "EGP",
  precision: 2,
  invoiceRemaining: egp("600.00"),
  installments: [] as InstallmentView[],
  methods,
  issueDate: "2026-01-01T00:00:00.000Z",
  today: "2026-06-15T00:00:00.000Z",
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

describe("record payment dialog", () => {
  it("is a modal dialog that moves focus to the amount field", () => {
    render(<RecordPaymentDialog {...props} />)
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true")
    expect(screen.getByLabelText("المبلغ")).toHaveFocus()
  })

  it("shows the remaining balance rather than leaving the user to work it out", () => {
    render(<RecordPaymentDialog {...props} />)
    expect(screen.getByText(/المتبقي على الفاتورة/)).toBeInTheDocument()
  })

  it("offers only active payment methods", () => {
    render(<RecordPaymentDialog {...props} />)
    const options = screen.getAllByRole("option").map((option) => option.textContent)
    expect(options).toContain("نقدي")
    expect(options).toContain("تحويل بنكي")
    expect(options).not.toContain("محفظة قديمة")
  })

  it("accepts a valid payment and reports a decimal string, never a number", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<RecordPaymentDialog {...props} onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText("المبلغ"), "100.50")
    await user.selectOptions(screen.getByLabelText("طريقة الدفع"), "cash")
    await user.click(screen.getByRole("button", { name: "تسجيل دفعة" }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    const submitted = onConfirm.mock.calls[0]![0]
    expect(submitted.amount).toBe("100.50")
    expect(typeof submitted.amount).toBe("string")
  })

  it("refuses an amount above the remaining balance and says by how much", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<RecordPaymentDialog {...props} onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText("المبلغ"), "600.01")
    await user.selectOptions(screen.getByLabelText("طريقة الدفع"), "cash")
    await user.click(screen.getByRole("button", { name: "تسجيل دفعة" }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/يتجاوز المتبقي/)
  })

  it("accepts exactly the remaining balance", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<RecordPaymentDialog {...props} onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText("المبلغ"), "600.00")
    await user.selectOptions(screen.getByLabelText("طريقة الدفع"), "cash")
    await user.click(screen.getByRole("button", { name: "تسجيل دفعة" }))

    expect(onConfirm).toHaveBeenCalled()
  })

  it("refuses a zero amount", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<RecordPaymentDialog {...props} onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText("المبلغ"), "0")
    await user.selectOptions(screen.getByLabelText("طريقة الدفع"), "cash")
    await user.click(screen.getByRole("button", { name: "تسجيل دفعة" }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("requires a payment method", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<RecordPaymentDialog {...props} onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText("المبلغ"), "50.00")
    await user.click(screen.getByRole("button", { name: "تسجيل دفعة" }))

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("moves focus to the first invalid field on a failed submit", async () => {
    const user = userEvent.setup()
    render(<RecordPaymentDialog {...props} />)

    await user.selectOptions(screen.getByLabelText("طريقة الدفع"), "cash")
    await user.click(screen.getByRole("button", { name: "تسجيل دفعة" }))

    expect(screen.getByLabelText("المبلغ")).toHaveFocus()
  })

  it("refuses a future payment date", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<RecordPaymentDialog {...props} onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText("المبلغ"), "50.00")
    await user.selectOptions(screen.getByLabelText("طريقة الدفع"), "cash")
    await user.clear(screen.getByLabelText("تاريخ الدفع"))
    await user.type(screen.getByLabelText("تاريخ الدفع"), "2026-12-01")
    await user.click(screen.getByRole("button", { name: "تسجيل دفعة" }))

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("offers only installments that still have a balance", async () => {
    render(<RecordPaymentDialog {...props} installments={installments} />)
    const select = screen.getByLabelText("القسط")
    const options = [...select.querySelectorAll("option")].map((o) => o.textContent)

    expect(options.some((label) => label?.includes("قسط 1"))).toBe(true)
    // Installment 2 is fully paid, so offering it would only produce a refusal.
    expect(options.some((label) => label?.includes("قسط 2"))).toBe(false)
  })

  it("applies the installment ceiling once one is targeted", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <RecordPaymentDialog
        {...props}
        installments={installments}
        onConfirm={onConfirm}
      />
    )

    await user.selectOptions(screen.getByLabelText("القسط"), "installment-1")
    await user.type(screen.getByLabelText("المبلغ"), "300.00")
    await user.selectOptions(screen.getByLabelText("طريقة الدفع"), "cash")
    await user.click(screen.getByRole("button", { name: "تسجيل دفعة" }))

    // 300 is within the invoice balance but above the 250 installment.
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/يتجاوز المتبقي على القسط/)
  })

  it("states that payments cannot be edited later", () => {
    render(<RecordPaymentDialog {...props} />)
    expect(
      screen.getByText(/لا يمكن تعديل أو حذف دفعة مسجلة/)
    ).toBeInTheDocument()
  })

  it("renders nothing when closed", () => {
    const { container } = render(<RecordPaymentDialog {...props} open={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
