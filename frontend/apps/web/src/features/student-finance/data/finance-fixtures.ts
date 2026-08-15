import { makeMoney, subtract, type Money } from "@/shared/utils/money"
import type {
  ActorRef,
  AdjustmentId,
  DiscountId,
  FinanceEventId,
  InstallmentId,
  InstallmentPlanId,
  InvoiceId,
  InvoiceStatus,
  OfferingKind,
  PaymentId,
  RefundId,
  RefundStatus,
  ScholarshipId,
} from "../types/common"
import type {
  Discount,
  FinanceTimelineEvent,
  FinancialAdjustment,
  Installment,
  InstallmentPlan,
  Invoice,
  InvoiceFigures,
  Payment,
  Refund,
  Scholarship,
} from "../types/domain"
import { buildSchedule } from "../utils/finance-installments"
import { computeFigures } from "../utils/finance-reductions"
import {
  CURRENCY,
  PRECISION,
  financeBatches,
  financeOfferings,
  numberingPolicy,
} from "./finance-lookups"
import { formatInvoiceNumber, formatReceiptNumber } from "../utils/finance-numbering"

export interface FinanceStore {
  invoices: Invoice[]
  plans: InstallmentPlan[]
  installments: Installment[]
  payments: Payment[]
  discounts: Discount[]
  scholarships: Scholarship[]
  adjustments: FinancialAdjustment[]
  refunds: Refund[]
  timeline: FinanceTimelineEvent[]
  /** Maps `(enrollmentId, purpose)` to the invoice it produced. */
  intakeIndex: Map<string, InvoiceId>
  invoiceSequence: number
  receiptSequence: number
}

const ORGANIZATION = "organization-alsalam"
const money = (amount: string): Money => makeMoney(amount, CURRENCY, PRECISION)

const actor = (id: string, name: string, active = true): ActorRef => ({
  id,
  name,
  active,
})
const demo = actor("employee-demo", "أحمد محمد")
const finance = actor("employee-finance", "سارة علي")

let sequence = 0
const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`

const offeringOf = (id: string) =>
  financeOfferings.find((entry) => entry.id === id)
const batchOf = (id?: string) =>
  id ? financeBatches.find((entry) => entry.id === id) : undefined

interface InvoiceSeed {
  studentId: string
  studentCode: string
  studentName: string
  enrollmentId: string
  branchId: string
  offeringId: string
  batchId?: string
  status: InvoiceStatus
  dueDate: string
  issueDate?: string
  /** Reductions applied before issuance, folded into the figures. */
  discount?: { kind: "percentage" | "amount"; value: string }
  scholarship?: { kind: "percentage" | "amount"; value: string }
  /** Instalment count; omitted means paid in full. */
  installments?: number
  /** Payments as decimal strings, applied in order against the invoice. */
  payments?: { amount: string; methodId: string; date: string; toInstallment?: number }[]
  /** Reduction recorded after issuance, becoming an adjustment. */
  postIssuanceAdjustment?: { amount: string; reason: string }
  refunds?: { paymentIndex: number; amount: string; status: RefundStatus }[]
}

/**
 * When a draft was created. A draft has no issue date, and dating its creation by
 * its *due* date would place the record in the future relative to the injected
 * clock — an invoice cannot have been created after now.
 */
const DRAFT_CREATED_AT = "2026-07-01T09:00:00.000Z"

const seeds: InvoiceSeed[] = [
  // Fully paid program invoice with an even instalment split.
  {
    studentId: "student-STD-2026-00001",
    studentCode: "STD-2026-00001",
    studentName: "يوسف عبد الرحمن",
    enrollmentId: "enrollment-1",
    branchId: "branch-main",
    offeringId: "offering-program-fullstack",
    batchId: "batch-fs-2026-a",
    status: "paid",
    issueDate: "2026-01-15T09:00:00.000Z",
    dueDate: "2026-02-15T09:00:00.000Z",
    installments: 3,
    payments: [
      { amount: "6000.00", methodId: "cash", date: "2026-01-20T09:00:00.000Z", toInstallment: 1 },
      { amount: "6000.00", methodId: "bank-transfer", date: "2026-02-20T09:00:00.000Z", toInstallment: 2 },
      { amount: "6000.00", methodId: "card", date: "2026-03-20T09:00:00.000Z", toInstallment: 3 },
    ],
  },
  // Partially paid, with an overdue instalment and an uneven split.
  {
    studentId: "student-STD-2026-00002",
    studentCode: "STD-2026-00002",
    studentName: "منة الله شريف",
    enrollmentId: "enrollment-2",
    branchId: "branch-cairo",
    offeringId: "offering-diploma-hr",
    status: "partially-paid",
    issueDate: "2026-02-01T09:00:00.000Z",
    dueDate: "2026-03-01T09:00:00.000Z",
    installments: 3,
    payments: [
      { amount: "3166.67", methodId: "cash", date: "2026-02-10T09:00:00.000Z", toInstallment: 1 },
    ],
  },
  // Issued, nothing collected, past due — drives the overdue status.
  {
    studentId: "student-STD-2026-00003",
    studentCode: "STD-2026-00003",
    studentName: "كريم مصطفى",
    enrollmentId: "enrollment-3",
    branchId: "branch-giza",
    offeringId: "offering-course-english",
    status: "issued",
    issueDate: "2026-03-01T09:00:00.000Z",
    dueDate: "2026-04-01T09:00:00.000Z",
  },
  // Pre-issuance scholarship and discount combined.
  {
    studentId: "student-STD-2026-00004",
    studentCode: "STD-2026-00004",
    studentName: "هالة عادل",
    enrollmentId: "enrollment-4",
    branchId: "branch-alex",
    offeringId: "offering-program-data",
    batchId: "batch-da-2026-a",
    status: "issued",
    issueDate: "2026-02-10T09:00:00.000Z",
    dueDate: "2026-09-01T09:00:00.000Z",
    scholarship: { kind: "percentage", value: "20" },
    discount: { kind: "percentage", value: "10" },
    installments: 4,
  },
  // Issued, then a post-issuance adjustment — issued figures must stay frozen.
  {
    studentId: "student-STD-2026-00005",
    studentCode: "STD-2026-00005",
    studentName: "طارق سليم",
    enrollmentId: "enrollment-5",
    branchId: "branch-alex",
    offeringId: "offering-diploma-marketing",
    status: "partially-paid",
    issueDate: "2026-01-05T09:00:00.000Z",
    dueDate: "2026-09-01T09:00:00.000Z",
    payments: [{ amount: "2000.00", methodId: "cash", date: "2026-01-10T09:00:00.000Z" }],
    postIssuanceAdjustment: { amount: "1000.00", reason: "تسوية معتمدة بعد الإصدار" },
  },
  // Payment with a completed refund — balance must return.
  {
    studentId: "student-STD-2026-00006",
    studentCode: "STD-2026-00006",
    studentName: "سلمى ناصر",
    enrollmentId: "enrollment-6",
    branchId: "branch-cairo",
    offeringId: "offering-course-excel",
    status: "partially-paid",
    issueDate: "2026-04-01T09:00:00.000Z",
    dueDate: "2026-09-01T09:00:00.000Z",
    payments: [{ amount: "2000.00", methodId: "card", date: "2026-04-05T09:00:00.000Z" }],
    refunds: [{ paymentIndex: 0, amount: "500.00", status: "completed" }],
  },
  // Draft — editable, not yet contributing an issued obligation.
  {
    studentId: "student-STD-2026-00007",
    studentCode: "STD-2026-00007",
    studentName: "زياد فؤاد",
    enrollmentId: "enrollment-7",
    branchId: "branch-main",
    offeringId: "offering-course-english",
    status: "draft",
    dueDate: "2026-10-01T09:00:00.000Z",
  },
  // Cancelled — readable, excluded from every balance.
  {
    studentId: "student-STD-2026-00001",
    studentCode: "STD-2026-00001",
    studentName: "يوسف عبد الرحمن",
    enrollmentId: "enrollment-1",
    branchId: "branch-main",
    offeringId: "offering-course-excel",
    status: "cancelled",
    issueDate: "2026-05-01T09:00:00.000Z",
    dueDate: "2026-06-01T09:00:00.000Z",
  },
]

function buildFigures(seed: InvoiceSeed): InvoiceFigures {
  const offering = offeringOf(seed.offeringId)
  const total = money(offering?.price ?? "1000.00")
  const computed = computeFigures(total, seed.scholarship, seed.discount)
  return {
    totalAmount: computed.totalAmount,
    discountTotal: computed.discountTotal,
    scholarshipTotal: computed.scholarshipTotal,
    finalAmount: computed.finalAmount,
  }
}

/** Deterministic seed store. Rebuilt on demand so tests never share mutations. */
export function createFinanceStore(): FinanceStore {
  sequence = 0
  const store: FinanceStore = {
    invoices: [],
    plans: [],
    installments: [],
    payments: [],
    discounts: [],
    scholarships: [],
    adjustments: [],
    refunds: [],
    timeline: [],
    intakeIndex: new Map(),
    invoiceSequence: 0,
    receiptSequence: 0,
  }

  let order = 0
  const pushEvent = (
    studentId: string,
    invoiceId: InvoiceId | undefined,
    category: FinanceTimelineEvent["category"],
    occurredAt: string,
    summary: string,
    amount?: Money
  ) => {
    store.timeline.push({
      id: nextId("finance-event") as FinanceEventId,
      studentId,
      invoiceId,
      category,
      occurredAt,
      sequence: (order += 1),
      actor: demo,
      amount,
      summary,
    })
  }

  for (const seed of seeds) {
    const figures = buildFigures(seed)
    const offering = offeringOf(seed.offeringId)
    const batch = batchOf(seed.batchId)
    const issued = seed.status !== "draft"
    const invoiceNumber = formatInvoiceNumber(
      numberingPolicy,
      (store.invoiceSequence += 1)
    )
    const invoiceId = `invoice-${invoiceNumber}` as InvoiceId

    const invoice: Invoice = {
      id: invoiceId,
      organizationId: ORGANIZATION,
      invoiceNumber,
      studentId: seed.studentId,
      studentCode: seed.studentCode,
      studentName: seed.studentName,
      enrollmentId: seed.enrollmentId,
      branchId: seed.branchId,
      offeringId: seed.offeringId,
      offeringLabel: offering?.label ?? seed.offeringId,
      offeringKind: (offering?.kind ?? "training-course") as OfferingKind,
      batchId: batch?.id,
      batchLabel: batch?.label,
      purpose: "tuition",
      issueDate: seed.issueDate,
      dueDate: seed.dueDate,
      currency: CURRENCY,
      precision: PRECISION,
      draft: figures,
      issuedSnapshot: issued ? figures : undefined,
      status: seed.status,
      statusHistory: [
        {
          fromStatus: null,
          toStatus: "draft",
          actor: demo,
          occurredAt: seed.issueDate ?? seed.dueDate,
        },
        ...(issued
          ? [
              {
                fromStatus: "draft" as InvoiceStatus,
                toStatus: "issued" as InvoiceStatus,
                actor: finance,
                occurredAt: seed.issueDate!,
              },
            ]
          : []),
      ],
      cancelledAt: seed.status === "cancelled" ? "2026-05-10T09:00:00.000Z" : undefined,
      cancelReason: seed.status === "cancelled" ? "أُنشئت بالخطأ" : undefined,
      createdAt: seed.issueDate ?? DRAFT_CREATED_AT,
      createdBy: demo,
      updatedAt: seed.issueDate ?? DRAFT_CREATED_AT,
      updatedBy: demo,
      version: issued ? 2 : 1,
    }

    store.invoices.push(invoice)
    store.intakeIndex.set(
      `enrollment:${seed.enrollmentId}:purpose:tuition`,
      invoiceId
    )
    pushEvent(
      seed.studentId,
      invoiceId,
      "invoice-created",
      invoice.createdAt,
      `تم إنشاء الفاتورة ${invoiceNumber}`,
      figures.finalAmount
    )
    if (issued)
      pushEvent(
        seed.studentId,
        invoiceId,
        "invoice-issued",
        seed.issueDate!,
        `تم إصدار الفاتورة ${invoiceNumber}`,
        figures.finalAmount
      )

    // Instalment plan
    const createdInstallments: Installment[] = []
    if (seed.installments && seed.installments > 0) {
      const planId = nextId("plan") as InstallmentPlanId
      store.plans.push({
        id: planId,
        invoiceId,
        count: seed.installments,
        scheduleBasis: "monthly",
        firstDueDate: seed.dueDate,
        generatedAt: seed.issueDate ?? seed.dueDate,
        generatedBy: finance,
      })
      const schedule = buildSchedule({
        finalAmount: figures.finalAmount,
        count: seed.installments,
        scheduleBasis: "monthly",
        firstDueDate: seed.dueDate,
      })
      for (const entry of schedule) {
        const installment: Installment = {
          id: nextId("installment") as InstallmentId,
          planId,
          invoiceId,
          sequence: entry.sequence,
          dueDate: entry.dueDate,
          amount: entry.amount,
        }
        createdInstallments.push(installment)
        store.installments.push(installment)
      }
      pushEvent(
        seed.studentId,
        invoiceId,
        "installment-plan-generated",
        seed.issueDate ?? DRAFT_CREATED_AT,
        `تم إنشاء خطة تقسيط من ${seed.installments} أقساط`
      )
    }

    // Payments
    const createdPayments: Payment[] = []
    for (const entry of seed.payments ?? []) {
      const receiptNumber = formatReceiptNumber(
        numberingPolicy,
        (store.receiptSequence += 1)
      )
      const payment: Payment = {
        id: `payment-${receiptNumber}` as PaymentId,
        organizationId: ORGANIZATION,
        receiptNumber,
        studentId: seed.studentId,
        invoiceId,
        installmentId: entry.toInstallment
          ? createdInstallments.find((item) => item.sequence === entry.toInstallment)?.id
          : undefined,
        branchId: seed.branchId,
        methodId: entry.methodId,
        methodLabel: entry.methodId,
        paymentDate: entry.date,
        amount: money(entry.amount),
        recordedAt: entry.date,
        recordedBy: finance,
      }
      createdPayments.push(payment)
      store.payments.push(payment)
      pushEvent(
        seed.studentId,
        invoiceId,
        "payment-received",
        entry.date,
        `تم استلام دفعة بإيصال ${receiptNumber}`,
        payment.amount
      )
    }

    // Pre-issuance reductions recorded as their own records too.
    if (seed.discount)
      store.discounts.push({
        id: nextId("discount") as DiscountId,
        invoiceId,
        kind: seed.discount.kind,
        value: seed.discount.value,
        reason: "خصم تجريبي",
        approvedBy: finance,
        approvedAt: seed.issueDate ?? seed.dueDate,
      })
    if (seed.scholarship)
      store.scholarships.push({
        id: nextId("scholarship") as ScholarshipId,
        studentId: seed.studentId,
        enrollmentId: seed.enrollmentId,
        name: "منحة التفوق",
        kind: seed.scholarship.kind,
        value: seed.scholarship.value,
        coverage: "partial-tuition",
        reason: "تفوق دراسي",
        approvedBy: finance,
        approvedAt: seed.issueDate ?? seed.dueDate,
      })

    // Post-issuance adjustment — the issued snapshot must remain untouched.
    if (seed.postIssuanceAdjustment) {
      store.adjustments.push({
        id: nextId("adjustment") as AdjustmentId,
        invoiceId,
        sourceKind: "discount",
        sourceId: nextId("discount-source"),
        amount: money(seed.postIssuanceAdjustment.amount),
        reason: seed.postIssuanceAdjustment.reason,
        approvedBy: finance,
        createdAt: "2026-03-15T09:00:00.000Z",
      })
      pushEvent(
        seed.studentId,
        invoiceId,
        "adjustment-recorded",
        "2026-03-15T09:00:00.000Z",
        seed.postIssuanceAdjustment.reason,
        money(seed.postIssuanceAdjustment.amount)
      )
    }

    // Refunds
    for (const entry of seed.refunds ?? []) {
      const payment = createdPayments[entry.paymentIndex]
      if (!payment) continue
      store.refunds.push({
        id: nextId("refund") as RefundId,
        paymentId: payment.id,
        invoiceId,
        studentId: seed.studentId,
        amount: money(entry.amount),
        reason: "انسحاب جزئي",
        refundDate: "2026-05-01T09:00:00.000Z",
        status: entry.status,
        requestedBy: demo,
        requestedAt: "2026-04-25T09:00:00.000Z",
        approvedBy: entry.status === "requested" ? undefined : finance,
        decidedAt: entry.status === "requested" ? undefined : "2026-04-28T09:00:00.000Z",
        completedAt: entry.status === "completed" ? "2026-05-01T09:00:00.000Z" : undefined,
      })
      if (entry.status === "completed")
        pushEvent(
          seed.studentId,
          invoiceId,
          "refund-completed",
          "2026-05-01T09:00:00.000Z",
          `تم إتمام استرداد على الإيصال ${payment.receiptNumber}`,
          money(entry.amount)
        )
    }
  }

  return store
}

/** A student deliberately carrying no financial records at all. */
export const studentWithoutRecordsId = "student-STD-2026-00099"

/** Confirms an invoice's remaining amount without going through the service. */
export function expectedRemaining(
  figures: InvoiceFigures,
  paid: string
): Money {
  return subtract(figures.finalAmount, money(paid))
}
