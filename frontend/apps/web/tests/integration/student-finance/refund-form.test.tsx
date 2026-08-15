import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RefundForm, refundableAmount } from "@/features/student-finance/forms/refund-form"
import { RefundStatusActions } from "@/features/student-finance/components/refund-status-actions"
import { makeMoney } from "@/shared/utils/money"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import { financePermissions } from "@/features/student-finance/config/finance-permissions"
import type { RefundStatus } from "@/features/student-finance/types/common"
import type { RefundSummary } from "@/features/student-finance/types/projections"

afterEach(cleanup)

const egp = (amount: string) => makeMoney(amount, "EGP", 2)
const TODAY = "2026-08-01T12:00:00.000Z"

function renderForm(
  overrides: Partial<React.ComponentProps<typeof RefundForm>> = {}
) {
  const onConfirm = overrides.onConfirm ?? vi.fn()
  render(
    <RefundForm
      open
      pending={false}
      receiptNumber="REC-2026-000123"
      refundable={egp("2000.00")}
      today={TODAY}
      onClose={vi.fn()}
      {...overrides}
      onConfirm={onConfirm}
    />
  )
  return onConfirm
}

const fill = async (amount: string, reason = "انسحاب الطالب") => {
  const user = userEvent.setup()
  await user.clear(screen.getByLabelText(/المبلغ/))
  await user.type(screen.getByLabelText(/المبلغ/), amount)
  await user.type(screen.getByLabelText(/السبب/), reason)
  return user
}

describe("the refundable ceiling is visible before it is hit", () => {
  it("shows the ceiling and the related receipt", () => {
    renderForm()
    expect(screen.getByText(/الحد الأقصى القابل للاسترداد/)).toBeInTheDocument()
    expect(screen.getByText(/REC-2026-000123/)).toBeInTheDocument()
  })

  it("refuses an amount above the ceiling and names the available figure", async () => {
    const onConfirm = renderForm()
    const user = await fill("2500.00")
    await user.click(screen.getByRole("button", { name: /طلب استرداد/ }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/2000\.00/)
  })

  it("accepts exactly the ceiling", async () => {
    const onConfirm = renderForm()
    const user = await fill("2000.00")
    await user.click(screen.getByRole("button", { name: /طلب استرداد/ }))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "2000.00", reason: "انسحاب الطالب" })
    )
  })

  it("refuses zero and negative amounts", async () => {
    for (const amount of ["0", "-100.00"]) {
      const onConfirm = renderForm()
      const user = await fill(amount)
      await user.click(screen.getByRole("button", { name: /طلب استرداد/ }))
      expect(onConfirm, amount).not.toHaveBeenCalled()
      cleanup()
    }
  })

  it("requires a reason", async () => {
    const onConfirm = renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/المبلغ/), "100.00")
    await user.click(screen.getByRole("button", { name: /طلب استرداد/ }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/سبب الاسترداد/)
  })

  it("refuses a future refund date", async () => {
    const onConfirm = renderForm()
    const user = await fill("100.00")
    const date = screen.getByLabelText(/تاريخ الاسترداد/)
    await user.clear(date)
    await user.type(date, "2026-12-31")
    await user.click(screen.getByRole("button", { name: /طلب استرداد/ }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/مستقبلي/)
  })

  it("says plainly that recording is not paying", async () => {
    renderForm()
    // A finance user must not believe the money left the account because a row
    // appeared in a queue.
    expect(screen.getByRole("note")).toHaveTextContent(/خارج هذه الوحدة/)
  })
})

describe("the refundable figure itself", () => {
  const held = (amount: string, status: RefundStatus) => ({
    amount: egp(amount),
    status,
  })

  it("is the payment when nothing has been refunded", () => {
    expect(refundableAmount(egp("2000.00"), []).amount).toBe("2000.00")
  })

  it("subtracts requested and approved refunds", () => {
    expect(
      refundableAmount(egp("2000.00"), [
        held("500.00", "requested"),
        held("300.00", "approved"),
      ]).amount
    ).toBe("1200.00")
  })

  it("subtracts completed refunds", () => {
    expect(
      refundableAmount(egp("2000.00"), [held("2000.00", "completed")]).amount
    ).toBe("0.00")
  })

  it("ignores rejected and cancelled refunds", () => {
    expect(
      refundableAmount(egp("2000.00"), [
        held("2000.00", "rejected"),
        held("1000.00", "cancelled"),
      ]).amount
    ).toBe("2000.00")
  })

  it("never goes negative", () => {
    expect(
      refundableAmount(egp("100.00"), [held("500.00", "completed")]).amount
    ).toBe("0.00")
  })
})

describe("decision actions follow the transition policy", () => {
  const refund = (status: RefundStatus): RefundSummary =>
    ({
      id: "refund-1",
      paymentId: "payment-1",
      receiptNumber: "REC-2026-000123",
      invoiceId: "invoice-1",
      invoiceNumber: "INV-2026-000045",
      studentId: "student-1",
      studentCode: "STD-2026-00001",
      studentName: "يوسف عبد الرحمن",
      branchLabel: "الفرع الرئيسي",
      amount: egp("1000.00"),
      refundDate: "2026-08-01T00:00:00.000Z",
      status,
      requestedByName: "موظف مالي",
      version: 3,
    }) as unknown as RefundSummary

  const grant = (permissions: string[]) => {
    useEmployeeContextStore.setState({
      context: { role: { permissionKeys: permissions } },
    } as never)
  }

  afterEach(() => useEmployeeContextStore.setState({ context: null } as never))

  it("offers approve and reject on a requested refund", () => {
    grant([financePermissions.refundsApprove])
    render(<RefundStatusActions refund={refund("requested")} pending={false} onDecide={vi.fn()} />)

    expect(screen.getByRole("button", { name: /اعتماد/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^رفض/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /إتمام/ })).not.toBeInTheDocument()
  })

  it("offers completion only once approved", () => {
    grant([financePermissions.refundsApprove])
    render(<RefundStatusActions refund={refund("approved")} pending={false} onDecide={vi.fn()} />)

    expect(screen.getByRole("button", { name: /إتمام/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /اعتماد/ })).not.toBeInTheDocument()
  })

  it("offers nothing on a terminal refund", () => {
    grant([financePermissions.refundsApprove])
    for (const status of ["completed", "rejected", "cancelled"] as const) {
      render(<RefundStatusActions refund={refund(status)} pending={false} onDecide={vi.fn()} />)
      expect(screen.queryAllByRole("button")).toHaveLength(0)
      cleanup()
    }
  })

  it("hides decisions from a user without the approval permission", () => {
    grant([financePermissions.refundsRecord, financePermissions.refundsView])
    render(<RefundStatusActions refund={refund("requested")} pending={false} onDecide={vi.fn()} />)
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("passes the invoice version through with the decision", async () => {
    grant([financePermissions.refundsApprove])
    const onDecide = vi.fn()
    render(<RefundStatusActions refund={refund("requested")} pending={false} onDecide={onDecide} />)

    await userEvent.setup().click(screen.getByRole("button", { name: /اعتماد/ }))
    expect(onDecide).toHaveBeenCalledWith(
      expect.objectContaining({ to: "approved" })
    )
    expect(onDecide.mock.calls[0]![0].refund.version).toBe(3)
  })
})

describe("rejecting demands a reason in the UI too", () => {
  const requested = {
    id: "refund-1",
    paymentId: "payment-1",
    receiptNumber: "REC-1",
    invoiceId: "invoice-1",
    invoiceNumber: "INV-1",
    studentId: "student-1",
    studentCode: "STD-1",
    studentName: "طالب",
    branchLabel: "فرع",
    amount: egp("1000.00"),
    refundDate: "2026-08-01T00:00:00.000Z",
    status: "requested",
    requestedByName: "موظف",
    version: 3,
  } as unknown as RefundSummary

  afterEach(() => useEmployeeContextStore.setState({ context: null } as never))

  it("does not submit a rejection until a reason is given", async () => {
    useEmployeeContextStore.setState({
      context: { role: { permissionKeys: [financePermissions.refundsApprove] } },
    } as never)
    const onDecide = vi.fn()
    const user = userEvent.setup()
    render(<RefundStatusActions refund={requested} pending={false} onDecide={onDecide} />)

    await user.click(screen.getByRole("button", { name: /^رفض/ }))
    expect(screen.getByRole("button", { name: /تأكيد الرفض/ })).toBeDisabled()
    expect(onDecide).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/سبب الرفض/), "طلب غير مبرر")
    await user.click(screen.getByRole("button", { name: /تأكيد الرفض/ }))

    expect(onDecide).toHaveBeenCalledWith(
      expect.objectContaining({ to: "rejected", reason: "طلب غير مبرر" })
    )
  })
})
