import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ApplyDiscountDialog } from "@/features/student-finance/components/apply-discount-dialog"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { formatMoney, makeMoney, subtract } from "@/shared/utils/money"
import type { DiscountPolicy } from "@/features/student-finance/types/domain"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

afterEach(cleanup)
beforeEach(() => resetFinanceStore())

const egp = (amount: string) => makeMoney(amount, "EGP", 2)
const policy: DiscountPolicy = { maxPercentage: "50", requiresApproval: true }

/** The base the service will resolve the reduction against. */
const discountBase = (invoice: InvoiceDetail) =>
  invoice.issuedSnapshot
    ? invoice.derived.finalAmount
    : subtract(invoice.draft.totalAmount, invoice.draft.scholarshipTotal)

async function firstInvoice(status: string): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices({ page: 1, pageSize: 200 })
  return studentFinanceService.getInvoice(
    page.items.find((item) => item.status === status)!.id
  )
}

function renderDialog(invoice: InvoiceDetail, onConfirm = vi.fn()) {
  render(
    <ApplyDiscountDialog
      open
      pending={false}
      base={discountBase(invoice)}
      currentFinal={invoice.derived.finalAmount}
      collected={invoice.derived.netPaid}
      policy={policy}
      isIssued={Boolean(invoice.issuedSnapshot)}
      onConfirm={onConfirm}
      onClose={vi.fn()}
    />
  )
  return onConfirm
}

async function fill(kind: "percentage" | "amount", value: string) {
  const user = userEvent.setup()
  await user.selectOptions(screen.getByLabelText(/نوع الخصم/), kind)
  await user.clear(screen.getByLabelText(/القيمة/))
  await user.type(screen.getByLabelText(/القيمة/), value)
  await user.type(screen.getByLabelText(/السبب/), "خصم معتمد")
  return user
}

/**
 * SC-004: what the approver sees before confirming must be what gets saved.
 *
 * These cases run the preview through the rendered component and the same values
 * through the real service, then compare the two — so a divergence in rounding,
 * in the reduction base, or in the order of operations fails here rather than
 * showing a user one number and storing another.
 */
describe("the preview equals the saved final amount", () => {
  const cases: Array<{ kind: "percentage" | "amount"; value: string }> = [
    { kind: "percentage", value: "10" },
    { kind: "percentage", value: "33" },
    { kind: "percentage", value: "7.5" },
    { kind: "amount", value: "250.00" },
    { kind: "amount", value: "0.01" },
  ]

  for (const { kind, value } of cases) {
    it(`holds for a draft invoice with a ${kind} of ${value}`, async () => {
      const invoice = await firstInvoice("draft")
      renderDialog(invoice)
      await fill(kind, value)

      const previewed = screen.getByTestId("discount-preview-final").textContent

      const saved = await studentFinanceService.applyDiscount({
        invoiceId: invoice.id,
        kind,
        value,
        reason: "خصم معتمد",
        expectedVersion: invoice.version,
      })

      expect(previewed).toBe(formatMoney(saved.draft.finalAmount))
      expect(previewed).toBe(formatMoney(saved.derived.finalAmount))
    })

    it(`holds for an issued invoice with a ${kind} of ${value}`, async () => {
      const invoice = await firstInvoice("issued")
      renderDialog(invoice)
      await fill(kind, value)

      const previewed = screen.getByTestId("discount-preview-final").textContent

      const saved = await studentFinanceService.applyDiscount({
        invoiceId: invoice.id,
        kind,
        value,
        reason: "خصم معتمد",
        expectedVersion: invoice.version,
      })

      // Post-issuance the reduction is an adjustment, so the derived amount is
      // what moves — the snapshot stays put.
      expect(previewed).toBe(formatMoney(saved.derived.finalAmount))
    })
  }

  it("holds on a draft that already carries a scholarship", async () => {
    const draft = await firstInvoice("draft")
    // A scholarship on the draft changes the base the discount resolves against.
    const withScholarship = await studentFinanceService.updateDraftInvoice({
      invoiceId: draft.id,
      input: {
        totalAmount: draft.draft.totalAmount.amount,
        scholarship: { kind: "percentage", value: "20" },
        dueDate: draft.dueDate!,
      },
      expectedVersion: draft.version,
    })

    renderDialog(withScholarship)
    await fill("percentage", "10")
    const previewed = screen.getByTestId("discount-preview-final").textContent

    const saved = await studentFinanceService.applyDiscount({
      invoiceId: withScholarship.id,
      kind: "percentage",
      value: "10",
      reason: "خصم معتمد",
      expectedVersion: withScholarship.version,
    })

    expect(previewed).toBe(formatMoney(saved.draft.finalAmount))
    // The scholarship survives the discount rather than being silently undone.
    expect(saved.draft.scholarshipTotal.amount).toBe(
      withScholarship.draft.scholarshipTotal.amount
    )
  })

  it("holds on an issued invoice that already carries an adjustment", async () => {
    let invoice = await firstInvoice("issued")
    invoice = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "amount",
      value: "100.00",
      reason: "تسوية أولى",
      expectedVersion: invoice.version,
    })

    renderDialog(invoice)
    await fill("percentage", "10")
    const previewed = screen.getByTestId("discount-preview-final").textContent

    const saved = await studentFinanceService.applyDiscount({
      invoiceId: invoice.id,
      kind: "percentage",
      value: "10",
      reason: "تسوية ثانية",
      expectedVersion: invoice.version,
    })

    expect(previewed).toBe(formatMoney(saved.derived.finalAmount))
  })
})

describe("limits are visible before they are violated", () => {
  it("names the configured maximum in the field label", async () => {
    const invoice = await firstInvoice("issued")
    renderDialog(invoice)
    expect(screen.getByLabelText(/الحد الأقصى المسموح به/)).toBeInTheDocument()
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it("refuses a value above the limit with an alert naming it", async () => {
    const invoice = await firstInvoice("issued")
    const onConfirm = renderDialog(invoice)
    const user = await fill("percentage", "80")
    await user.click(screen.getByRole("button", { name: /تطبيق خصم/ }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/تتجاوز الحد/)
  })

  it("refuses a reduction below what has already been collected", async () => {
    const invoice = await firstInvoice("partially-paid")
    const onConfirm = renderDialog(invoice)
    const user = await fill("percentage", "50")
    await user.click(screen.getByRole("button", { name: /تطبيق خصم/ }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/المبلغ المحصّل/)
  })

  it("requires a reason rather than submitting a blank one", async () => {
    const invoice = await firstInvoice("issued")
    const onConfirm = renderDialog(invoice)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/القيمة/), "5")
    await user.click(screen.getByRole("button", { name: /تطبيق خصم/ }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/السبب مطلوب/)
  })
})

describe("the approver is told what they are authorising", () => {
  it("explains that an issued invoice gets an adjustment, not an edit", async () => {
    const invoice = await firstInvoice("issued")
    renderDialog(invoice)
    expect(screen.getByRole("note")).toHaveTextContent(/تسوية/)
  })

  it("shows no such notice on a draft, where the invoice itself changes", async () => {
    const invoice = await firstInvoice("draft")
    renderDialog(invoice)
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })

  it("submits the trimmed values once valid", async () => {
    const invoice = await firstInvoice("issued")
    const onConfirm = renderDialog(invoice)
    const user = await fill("percentage", "5")
    await user.click(screen.getByRole("button", { name: /تطبيق خصم/ }))

    expect(onConfirm).toHaveBeenCalledWith({
      kind: "percentage",
      value: "5",
      reason: "خصم معتمد",
    })
  })
})

describe("preview arithmetic", () => {
  it("shows nothing until the value is a well-formed number", async () => {
    const invoice = await firstInvoice("issued")
    renderDialog(invoice)
    expect(screen.queryByTestId("discount-preview-final")).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/القيمة/), "abc")
    expect(screen.queryByTestId("discount-preview-final")).not.toBeInTheDocument()
  })

  it("never previews a negative amount", async () => {
    const invoice = await firstInvoice("issued")
    renderDialog(invoice)
    await fill("amount", "999999.00")

    const previewed = screen.getByTestId("discount-preview-final").textContent
    expect(previewed).toBe(formatMoney(egp("0.00")))
  })
})
