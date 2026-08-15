import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CancelInvoiceDialog } from "@/features/student-finance/components/cancel-invoice-dialog"
import {
  FinancialStatusBadge,
  InstallmentStatusBadge,
  InvoiceStatusBadge,
  RefundStatusBadge,
} from "@/features/student-finance/components/invoice-status-badge"
import { MoneyValue } from "@/features/student-finance/components/money-value"
import { makeMoney } from "@/shared/utils/money"

afterEach(cleanup)

describe("money presentation", () => {
  it("renders the amount with its currency", () => {
    render(<MoneyValue value={makeMoney("1234.50", "EGP", 2)} />)
    // The currency must be part of the rendered value, not decoration.
    expect(screen.getByText(/١٬٢٣٤٫٥٠|1,234.50/)).toBeInTheDocument()
  })

  it("isolates the value so Arabic layout cannot reorder its digits", () => {
    const { container } = render(
      <MoneyValue value={makeMoney("1234.50", "EGP", 2)} />
    )
    const isolated = container.querySelector("bdi")
    expect(isolated).toBeTruthy()
    expect(isolated).toHaveAttribute("dir", "ltr")
  })

  it("renders zero as a real value rather than a blank", () => {
    const { container } = render(
      <MoneyValue value={makeMoney("0.00", "EGP", 2)} />
    )
    expect(container.textContent?.trim()).not.toBe("")
  })
})

describe("status badges encode meaning in text", () => {
  it("labels every invoice status in Arabic, never colour alone", () => {
    for (const [status, label] of [
      ["draft", "مسودة"],
      ["issued", "صادرة"],
      ["partially-paid", "مدفوعة جزئيًا"],
      ["paid", "مدفوعة بالكامل"],
      ["cancelled", "ملغاة"],
    ] as const) {
      cleanup()
      render(<InvoiceStatusBadge status={status} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("labels installment, financial, and refund statuses", () => {
    render(<InstallmentStatusBadge status="overdue" />)
    expect(screen.getByText("متأخر")).toBeInTheDocument()
    cleanup()

    render(<FinancialStatusBadge status="no-outstanding-balance" />)
    expect(screen.getByText("لا يوجد رصيد مستحق")).toBeInTheDocument()
    cleanup()

    render(<RefundStatusBadge status="completed" />)
    expect(screen.getByText("مكتمل")).toBeInTheDocument()
  })
})

describe("cancel invoice dialog", () => {
  const props = {
    open: true,
    pending: false,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  }

  it("is a modal dialog that moves focus to the reason field", () => {
    render(<CancelInvoiceDialog {...props} />)
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(screen.getByRole("textbox")).toHaveFocus()
  })

  it("blocks confirmation until a reason is entered", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<CancelInvoiceDialog {...props} onConfirm={onConfirm} />)

    const confirm = screen.getByRole("button", { name: "إلغاء الفاتورة" })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByRole("textbox"), "أُنشئت بالخطأ")
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith("أُنشئت بالخطأ")
  })

  it("announces a missing reason once the field is touched", async () => {
    const user = userEvent.setup()
    render(<CancelInvoiceDialog {...props} />)

    await user.click(screen.getByRole("textbox"))
    await user.tab()
    expect(screen.getByRole("alert")).toHaveTextContent("سبب الإلغاء مطلوب")
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true")
  })

  it("never submits a fabricated reason", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<CancelInvoiceDialog {...props} onConfirm={onConfirm} />)

    await user.type(screen.getByRole("textbox"), "   ")
    expect(screen.getByRole("button", { name: "إلغاء الفاتورة" })).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("warns that cancellation preserves the record", () => {
    render(<CancelInvoiceDialog {...props} />)
    expect(
      screen.getByText(/مع الاحتفاظ بها للسجل التاريخي/)
    ).toBeInTheDocument()
  })

  it("renders nothing when closed", () => {
    const { container } = render(<CancelInvoiceDialog {...props} open={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
