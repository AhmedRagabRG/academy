import { makeMoney, multiplyByPercentage } from "@/shared/utils/money"
import type {
  InvoiceId,
  InvoiceStatus,
  OfferingKind,
  PaymentId,
} from "../types/common"
import type { Invoice, Payment } from "../types/domain"
import { computeFigures } from "../utils/finance-reductions"
import {
  CURRENCY,
  PRECISION,
  financeBranches,
  financeOfferings,
  paymentMethods,
} from "./finance-lookups"

/**
 * Deterministic large-set generation for the SC-010 performance target
 * (2s p95 across 50,000 invoices). The same index always yields the same record.
 */

const ORGANIZATION = "organization-alsalam"
const actor = { id: "employee-finance", name: "سارة علي", active: true }
const activeBranches = financeBranches.filter((branch) => branch.active)
const activeMethods = paymentMethods.filter((method) => method.active)

const statuses: InvoiceStatus[] = [
  "issued",
  "issued",
  "partially-paid",
  "partially-paid",
  "paid",
  "draft",
  "cancelled",
]

function hash(seed: number, salt: number): number {
  return Math.abs(Math.imul(seed + salt, 2654435761)) % 1_000_003
}

const pick = <T>(items: readonly T[], seed: number, salt: number): T =>
  items[hash(seed, salt) % items.length] as T

export interface ScaleData {
  invoices: Invoice[]
  payments: Payment[]
}

export function buildScaleInvoice(index: number): Invoice {
  const invoiceNumber = `INV-2026-${String(index + 1000).padStart(5, "0")}`
  const offering = pick(financeOfferings, index, 11)
  const branch = pick(activeBranches, index, 13)
  const status = pick(statuses, index, 17)
  const month = 1 + (hash(index, 19) % 12)
  const day = 1 + (hash(index, 23) % 28)
  const issueDate = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00:00.000Z`

  const figures = computeFigures(makeMoney(offering.price, CURRENCY, PRECISION))
  const issued = status !== "draft"

  return {
    id: `invoice-${invoiceNumber}` as InvoiceId,
    organizationId: ORGANIZATION,
    invoiceNumber,
    studentId: `student-scale-${index % 12_000}`,
    studentCode: `STD-2026-${String((index % 12_000) + 1000).padStart(5, "0")}`,
    studentName: `طالب ${index % 12_000}`,
    enrollmentId: `enrollment-scale-${index}`,
    branchId: branch.value,
    offeringId: offering.id,
    offeringLabel: offering.label,
    offeringKind: offering.kind as OfferingKind,
    purpose: "tuition",
    issueDate: issued ? issueDate : undefined,
    dueDate: issueDate,
    currency: CURRENCY,
    precision: PRECISION,
    draft: figures,
    issuedSnapshot: issued ? figures : undefined,
    status,
    statusHistory: [
      { fromStatus: null, toStatus: "draft", actor, occurredAt: issueDate },
    ],
    createdAt: issueDate,
    createdBy: actor,
    updatedAt: issueDate,
    updatedBy: actor,
    version: issued ? 2 : 1,
  }
}

export function buildScaleInvoices(count = 50_000): ScaleData {
  const invoices: Invoice[] = []
  const payments: Payment[] = []

  for (let index = 0; index < count; index += 1) {
    const invoice = buildScaleInvoice(index)
    invoices.push(invoice)

    // Roughly a third of invoices carry a payment, so balance derivation is
    // exercised rather than trivially zero.
    if (invoice.status === "partially-paid" || invoice.status === "paid") {
      const method = pick(activeMethods, index, 29)
      // Expressed as a percentage so the amount is derived by the money module
      // rather than by float multiplication — a fixture that produces a value
      // the module could not have produced is not a fixture of this system.
      const share = invoice.status === "paid" ? "100" : "40"
      payments.push({
        id: `payment-scale-${index}` as PaymentId,
        organizationId: ORGANIZATION,
        receiptNumber: `RCP-2026-${String(index + 1000).padStart(5, "0")}`,
        studentId: invoice.studentId,
        invoiceId: invoice.id,
        branchId: invoice.branchId,
        methodId: method.id,
        methodLabel: method.label,
        paymentDate: invoice.dueDate,
        amount: multiplyByPercentage(invoice.draft.finalAmount, share),
        recordedAt: invoice.dueDate,
        recordedBy: actor,
      })
    }
  }

  return { invoices, payments }
}
