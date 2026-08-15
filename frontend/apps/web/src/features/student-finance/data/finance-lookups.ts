import { makeMoney } from "@/shared/utils/money"
import type { LookupOption } from "../types/common"
import type {
  DiscountPolicy,
  DuePolicy,
  InstallmentEligibility,
  NumberingPolicy,
  PaymentMethod,
  ScholarshipPolicy,
} from "../types/domain"

/**
 * Seeded configurable business data. Nothing here is an application rule — the
 * service reads it through lookups so a future administration source can replace
 * it without touching a screen (constitution III).
 */

export const CURRENCY = "EGP"
export const PRECISION = 2

const option = (value: string, label: string, active = true): LookupOption => ({
  value,
  label,
  active,
})

export const financeBranches: LookupOption[] = [
  option("branch-main", "الفرع الرئيسي"),
  option("branch-cairo", "فرع القاهرة"),
  option("branch-giza", "فرع الجيزة"),
  option("branch-alex", "فرع الإسكندرية"),
]

export const paymentMethods: PaymentMethod[] = [
  { id: "cash", label: "نقدي", active: true },
  { id: "bank-transfer", label: "تحويل بنكي", active: true },
  { id: "card", label: "بطاقة ائتمانية", active: true },
  { id: "cheque", label: "شيك", active: true },
  { id: "legacy-wallet", label: "محفظة قديمة", active: false },
]

export const discountPolicy: DiscountPolicy = {
  maxPercentage: "50",
  maxAmount: makeMoney("10000.00", CURRENCY, PRECISION),
  requiresApproval: true,
}

export const scholarshipPolicy: ScholarshipPolicy = {
  maxPercentage: "100",
  requiresApproval: true,
}

/**
 * Whether a product type permits instalments is configuration, not a hardcoded
 * rule — courses default to paid-in-full but the organization can change it
 * (spec FR-013).
 */
export const installmentEligibility: InstallmentEligibility[] = [
  { offeringKind: "professional-program", allowsPlan: true, maxCount: 12 },
  { offeringKind: "professional-diploma", allowsPlan: true, maxCount: 6 },
  { offeringKind: "training-course", allowsPlan: false, maxCount: 0 },
]

export const numberingPolicy: NumberingPolicy = {
  invoicePrefix: "INV",
  receiptPrefix: "RCP",
  year: 2026,
  width: 5,
}

export const duePolicy: DuePolicy = {
  defaultDueDays: 30,
  overdueGraceDays: 0,
}

export interface FinanceOfferingEntry {
  id: string
  kind: "professional-program" | "professional-diploma" | "training-course"
  label: string
  price: string
}

export const financeOfferings: FinanceOfferingEntry[] = [
  {
    id: "offering-program-fullstack",
    kind: "professional-program",
    label: "برنامج تطوير الويب الاحترافي",
    price: "18000.00",
  },
  {
    id: "offering-program-data",
    kind: "professional-program",
    label: "برنامج تحليل البيانات",
    price: "21000.00",
  },
  {
    id: "offering-diploma-hr",
    kind: "professional-diploma",
    label: "دبلومة الموارد البشرية",
    price: "9500.00",
  },
  {
    id: "offering-diploma-marketing",
    kind: "professional-diploma",
    label: "دبلومة التسويق الرقمي",
    price: "8000.00",
  },
  {
    id: "offering-course-english",
    kind: "training-course",
    label: "دورة اللغة الإنجليزية",
    price: "3500.00",
  },
  {
    id: "offering-course-excel",
    kind: "training-course",
    label: "دورة إكسل المتقدم",
    price: "2000.00",
  },
]

export const financeBatches: { id: string; programId: string; label: string }[] = [
  {
    id: "batch-fs-2026-a",
    programId: "offering-program-fullstack",
    label: "دفعة تطوير الويب - يناير ٢٠٢٦",
  },
  {
    id: "batch-fs-2026-b",
    programId: "offering-program-fullstack",
    label: "دفعة تطوير الويب - مايو ٢٠٢٦",
  },
  {
    id: "batch-da-2026-a",
    programId: "offering-program-data",
    label: "دفعة تحليل البيانات - مارس ٢٠٢٦",
  },
]

export function financeConfiguration() {
  return {
    branches: financeBranches,
    paymentMethods,
    discountPolicy,
    scholarshipPolicy,
    numbering: numberingPolicy,
    duePolicy,
    installmentEligibility,
    currency: CURRENCY,
    precision: PRECISION,
  }
}

export function offeringOptions(): LookupOption[] {
  return financeOfferings.map((entry) => option(entry.id, entry.label))
}

export function batchOptions(): LookupOption[] {
  return financeBatches.map((entry) => option(entry.id, entry.label))
}
