import { describe, expect, it } from "vitest"
import {
  affectsBalance,
  allowedInvoiceTransitions,
  allowedRefundTransitions,
  evaluateInvoiceTransition,
  invoiceTransitionRule,
  isEditable,
  refundTransitionRule,
} from "@/features/student-finance/utils/finance-lifecycle"
import {
  allocateNumber,
  createNumberAllocator,
  formatInvoiceNumber,
  formatReceiptNumber,
  parseSequence,
} from "@/features/student-finance/utils/finance-numbering"
import { allFinancePermissions } from "@/features/student-finance/config/finance-permissions"
import type { NumberingPolicy } from "@/features/student-finance/types/domain"

const permissions = allFinancePermissions as readonly string[]

describe("invoice transition table", () => {
  it("allows only issue and cancel from draft", () => {
    expect(allowedInvoiceTransitions("draft").sort()).toEqual(["cancelled", "issued"])
  })

  it("allows only cancellation from issued and partially paid", () => {
    expect(allowedInvoiceTransitions("issued")).toEqual(["cancelled"])
    expect(allowedInvoiceTransitions("partially-paid")).toEqual(["cancelled"])
  })

  it("allows nothing from paid or cancelled", () => {
    expect(allowedInvoiceTransitions("paid")).toEqual([])
    expect(allowedInvoiceTransitions("cancelled")).toEqual([])
  })

  it("never allows returning to draft after issuance", () => {
    for (const from of ["issued", "partially-paid", "paid", "cancelled"] as const)
      expect(invoiceTransitionRule(from, "draft")).toBeUndefined()
  })

  it("never allows re-issuing", () => {
    expect(invoiceTransitionRule("issued", "issued")).toBeUndefined()
    expect(invoiceTransitionRule("cancelled", "issued")).toBeUndefined()
  })

  it("maps each transition to its exact permission", () => {
    expect(invoiceTransitionRule("draft", "issued")?.permission).toBe("finance.invoices.issue")
    expect(invoiceTransitionRule("issued", "cancelled")?.permission).toBe("finance.invoices.cancel")
  })

  it("requires a reason to cancel but not to issue", () => {
    expect(invoiceTransitionRule("draft", "issued")?.reasonRequired).toBe(false)
    expect(invoiceTransitionRule("issued", "cancelled")?.reasonRequired).toBe(true)
  })

  it("marks post-issuance cancellation as blocked by payments", () => {
    expect(invoiceTransitionRule("issued", "cancelled")?.blockedByPayments).toBe(true)
    expect(invoiceTransitionRule("draft", "cancelled")?.blockedByPayments).toBeUndefined()
  })
})

describe("invoice transition evaluation", () => {
  const base = { permissions, hasPayments: false }

  it("accepts issuing a draft", () => {
    expect(evaluateInvoiceTransition({ ...base, from: "draft", to: "issued" }).ok).toBe(true)
  })

  it("refuses a transition the table disallows", () => {
    const result = evaluateInvoiceTransition({ ...base, from: "paid", to: "cancelled" })
    expect(result).toMatchObject({ ok: false, code: "invoice-immutable" })
  })

  it("refuses without the exact permission", () => {
    expect(
      evaluateInvoiceTransition({
        ...base,
        from: "draft",
        to: "issued",
        permissions: ["finance.invoices.view"],
      })
    ).toMatchObject({ ok: false, code: "forbidden" })
  })

  it("refuses cancelling an invoice that carries payments", () => {
    expect(
      evaluateInvoiceTransition({
        ...base,
        from: "issued",
        to: "cancelled",
        reason: "خطأ في الإصدار",
        hasPayments: true,
      })
    ).toMatchObject({ ok: false, code: "invoice-has-payments" })
  })

  it("allows cancelling a draft even though drafts cannot carry payments", () => {
    expect(
      evaluateInvoiceTransition({
        ...base,
        from: "draft",
        to: "cancelled",
        reason: "أُنشئت بالخطأ",
      }).ok
    ).toBe(true)
  })

  it("refuses cancellation without a reason", () => {
    expect(
      evaluateInvoiceTransition({ ...base, from: "issued", to: "cancelled" })
    ).toMatchObject({ ok: false, code: "validation-failed" })
  })

  it("checks the payment guard before the reason, so the blocking fact surfaces first", () => {
    expect(
      evaluateInvoiceTransition({
        ...base,
        from: "issued",
        to: "cancelled",
        hasPayments: true,
      })
    ).toMatchObject({ code: "invoice-has-payments" })
  })
})

describe("editability", () => {
  it("permits editing only a draft", () => {
    expect(isEditable("draft")).toBe(true)
    for (const status of ["issued", "partially-paid", "paid", "cancelled"] as const)
      expect(isEditable(status)).toBe(false)
  })
})

describe("refund transition table", () => {
  it("separates approval from recording", () => {
    expect(refundTransitionRule("requested", "approved")?.permission).toBe("finance.refunds.approve")
    expect(refundTransitionRule("requested", "cancelled")?.permission).toBe("finance.refunds.record")
  })

  it("allows completion only from approved", () => {
    expect(refundTransitionRule("requested", "completed")).toBeUndefined()
    expect(refundTransitionRule("approved", "completed")).toBeDefined()
  })

  it("allows nothing from a terminal status", () => {
    expect(allowedRefundTransitions("completed")).toEqual([])
    expect(allowedRefundTransitions("rejected")).toEqual([])
    expect(allowedRefundTransitions("cancelled")).toEqual([])
  })

  it("requires a reason to reject or cancel", () => {
    expect(refundTransitionRule("requested", "rejected")?.reasonRequired).toBe(true)
    expect(refundTransitionRule("approved", "cancelled")?.reasonRequired).toBe(true)
  })

  it("counts only a completed refund against the balance", () => {
    expect(affectsBalance("completed")).toBe(true)
    for (const status of ["requested", "approved", "rejected", "cancelled"] as const)
      expect(affectsBalance(status)).toBe(false)
  })
})

describe("numbering", () => {
  const policy: NumberingPolicy = {
    invoicePrefix: "INV",
    receiptPrefix: "RCP",
    year: 2026,
    width: 5,
  }

  it("formats zero-padded sequential numbers", () => {
    expect(formatInvoiceNumber(policy, 7)).toBe("INV-2026-00007")
    expect(formatReceiptNumber(policy, 42)).toBe("RCP-2026-00042")
  })

  it("skips numbers already taken", () => {
    const taken = new Set(["INV-2026-00001", "INV-2026-00002"])
    expect(allocateNumber("INV", policy, taken)).toBe("INV-2026-00003")
  })

  it("parses a sequence back out", () => {
    expect(parseSequence("INV-2026-00042", "INV", policy)).toBe(42)
    expect(parseSequence("NOT-A-NUMBER", "INV", policy)).toBeUndefined()
  })

  it("never issues the same number twice through the reservation allocator", () => {
    const allocator = createNumberAllocator(policy)
    const existing = new Set<string>()
    const issued = Array.from({ length: 50 }, () =>
      allocator.allocateInvoiceNumber(existing)
    )
    expect(new Set(issued).size).toBe(50)
  })

  it("keeps invoice and receipt sequences independent", () => {
    const allocator = createNumberAllocator(policy)
    const invoiceNumber = allocator.allocateInvoiceNumber(new Set())
    const receiptNumber = allocator.allocateReceiptNumber(new Set())
    expect(invoiceNumber).toContain("INV-")
    expect(receiptNumber).toContain("RCP-")
  })

  it("frees a reservation when a command fails before persisting", () => {
    const allocator = createNumberAllocator(policy)
    const first = allocator.allocateInvoiceNumber(new Set())
    allocator.release(first)
    expect(allocator.allocateInvoiceNumber(new Set())).toBe(first)
  })
})
