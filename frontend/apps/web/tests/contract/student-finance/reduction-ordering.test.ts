import { beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { compare, makeMoney } from "@/shared/utils/money"
import type { InvoiceDetail } from "@/features/student-finance/types/projections"

beforeEach(() => resetFinanceStore())

const zero = makeMoney("0", "EGP", 2)

/** The only draft invoice in the fixtures — editable, so figures recompute. */
const DRAFT_STUDENT = "student-STD-2026-00007"
/** Seeded with a 20% scholarship and a 10% discount, both pre-issuance. */
const SEEDED_BOTH = "student-STD-2026-00004"

async function onlyInvoice(studentId: string): Promise<InvoiceDetail> {
  const page = await studentFinanceService.listInvoices({
    page: 1,
    pageSize: 200,
    studentIds: [studentId],
  })
  return studentFinanceService.getInvoice(page.items[0]!.id)
}

const scale = (amount: string, factor: number) =>
  (Number(amount) * factor).toFixed(2)

const awardScholarship = (studentId: string, value: string) =>
  studentFinanceService.awardScholarship({
    studentId,
    name: "منحة التفوق",
    kind: "percentage",
    value,
    coverage: "partial-tuition",
    reason: "تفوق دراسي",
  })

const applyDiscount = (invoice: InvoiceDetail, value: string) =>
  studentFinanceService.applyDiscount({
    invoiceId: invoice.id,
    kind: "percentage",
    value,
    reason: "خصم معتمد",
    expectedVersion: invoice.version,
  })

/**
 * FR-024: the order in which a discount and a scholarship combine is explicit,
 * deterministic, and the same everywhere a final amount is derived — scholarship
 * against the tuition base first, then discount against the remainder.
 */
describe("the documented order", () => {
  it("applies the scholarship to the base and the discount to the remainder", async () => {
    const seeded = await onlyInvoice(SEEDED_BOTH)
    const total = seeded.issuedSnapshot!.totalAmount.amount

    // 20% scholarship, then 10% discount on the remaining 80%.
    expect(seeded.issuedSnapshot!.scholarshipTotal.amount).toBe(scale(total, 0.2))
    expect(seeded.issuedSnapshot!.discountTotal.amount).toBe(scale(total, 0.08))
    expect(seeded.issuedSnapshot!.finalAmount.amount).toBe(scale(total, 0.72))
  })

  it("does not apply the discount to the full base", async () => {
    const seeded = await onlyInvoice(SEEDED_BOTH)
    const total = seeded.issuedSnapshot!.totalAmount.amount
    // The reversed order would give 0.10 × total and a 0.70 × total final.
    expect(seeded.issuedSnapshot!.discountTotal.amount).not.toBe(scale(total, 0.1))
    expect(seeded.issuedSnapshot!.finalAmount.amount).not.toBe(scale(total, 0.7))
  })
})

describe("the order of approval does not change the result", () => {
  it("gives the same final amount whichever reduction is recorded first", async () => {
    const first = await onlyInvoice(DRAFT_STUDENT)
    const total = first.draft.totalAmount.amount

    // Discount first, then the scholarship.
    await applyDiscount(first, "10")
    await awardScholarship(DRAFT_STUDENT, "20")
    const discountFirst = await onlyInvoice(DRAFT_STUDENT)

    resetFinanceStore()

    // Scholarship first, then the discount.
    await awardScholarship(DRAFT_STUDENT, "20")
    const afterAward = await onlyInvoice(DRAFT_STUDENT)
    await applyDiscount(afterAward, "10")
    const scholarshipFirst = await onlyInvoice(DRAFT_STUDENT)

    expect(discountFirst.draft.finalAmount.amount).toBe(
      scholarshipFirst.draft.finalAmount.amount
    )
    expect(discountFirst.draft.finalAmount.amount).toBe(scale(total, 0.72))
  })

  it("keeps both component figures identical too, not just the total", async () => {
    const first = await onlyInvoice(DRAFT_STUDENT)
    await applyDiscount(first, "10")
    await awardScholarship(DRAFT_STUDENT, "20")
    const discountFirst = await onlyInvoice(DRAFT_STUDENT)

    resetFinanceStore()

    await awardScholarship(DRAFT_STUDENT, "20")
    await applyDiscount(await onlyInvoice(DRAFT_STUDENT), "10")
    const scholarshipFirst = await onlyInvoice(DRAFT_STUDENT)

    expect(discountFirst.draft.scholarshipTotal.amount).toBe(
      scholarshipFirst.draft.scholarshipTotal.amount
    )
    expect(discountFirst.draft.discountTotal.amount).toBe(
      scholarshipFirst.draft.discountTotal.amount
    )
  })

  it("re-resolves the discount against the smaller remainder rather than freezing it", async () => {
    const invoice = await onlyInvoice(DRAFT_STUDENT)
    const total = invoice.draft.totalAmount.amount

    await applyDiscount(invoice, "10")
    const beforeAward = await onlyInvoice(DRAFT_STUDENT)
    expect(beforeAward.draft.discountTotal.amount).toBe(scale(total, 0.1))

    await awardScholarship(DRAFT_STUDENT, "20")
    const afterAward = await onlyInvoice(DRAFT_STUDENT)
    // Still 10%, now of the post-scholarship remainder — not the frozen figure.
    expect(afterAward.draft.discountTotal.amount).toBe(scale(total, 0.08))
  })
})

describe("combined reductions respect both floors", () => {
  it("never produces a negative final amount, even at the maximum of each", async () => {
    const invoice = await onlyInvoice(DRAFT_STUDENT)
    await applyDiscount(invoice, "50")
    await awardScholarship(DRAFT_STUDENT, "100")

    const after = await onlyInvoice(DRAFT_STUDENT)
    expect(compare(after.draft.finalAmount, zero)).toBeGreaterThanOrEqual(0)
    expect(after.draft.finalAmount.amount).toBe(zero.amount)
  })

  it("never lets the combined reduction exceed the invoice total", async () => {
    const invoice = await onlyInvoice(DRAFT_STUDENT)
    const total = Number(invoice.draft.totalAmount.amount)

    await applyDiscount(invoice, "50")
    await awardScholarship(DRAFT_STUDENT, "80")

    const after = await onlyInvoice(DRAFT_STUDENT)
    const combined =
      Number(after.draft.scholarshipTotal.amount) +
      Number(after.draft.discountTotal.amount)
    expect(combined).toBeLessThanOrEqual(total)
  })

  it("keeps a part-paid invoice above what has been collected", async () => {
    const student = "student-STD-2026-00005"
    const before =
      await studentFinanceService.getStudentFinancialProfile(student)

    await awardScholarship(student, "100")
    const invoice = await onlyInvoice(student)

    expect(
      compare(invoice.derived.finalAmount, invoice.derived.netPaid)
    ).toBeGreaterThanOrEqual(0)
    expect(invoice.derived.netPaid.amount).toBe(before.totals.paidAmount.amount)
  })
})

describe("post-issuance reductions stack on what is owed at the time", () => {
  it("records each as its own adjustment against the then-current balance", async () => {
    const student = "student-STD-2026-00003"
    const before = await onlyInvoice(student)
    const issued = Number(before.issuedSnapshot!.finalAmount.amount)

    await applyDiscount(before, "10")
    const afterDiscount = await onlyInvoice(student)
    await awardScholarship(student, "25")
    const afterBoth = await onlyInvoice(student)

    // 10% of the issued amount, then 25% of what remained after it.
    expect(Number(afterDiscount.derived.finalAmount.amount)).toBeCloseTo(
      issued * 0.9,
      2
    )
    expect(Number(afterBoth.derived.finalAmount.amount)).toBeCloseTo(
      issued * 0.9 * 0.75,
      2
    )
    expect(afterBoth.adjustments).toHaveLength(2)
  })

  it("leaves the issued figures untouched throughout", async () => {
    const student = "student-STD-2026-00003"
    const before = await onlyInvoice(student)
    const snapshot = JSON.stringify(before.issuedSnapshot)

    await applyDiscount(before, "10")
    await awardScholarship(student, "25")

    const after = await onlyInvoice(student)
    expect(JSON.stringify(after.issuedSnapshot)).toBe(snapshot)
  })
})
