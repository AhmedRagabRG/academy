import { z } from "zod"
import { compare, makeMoney, type Money } from "@/shared/utils/money"
import type { InstallmentEligibility, PaymentMethod } from "../types/domain"
import { validatePlanRequest } from "../utils/finance-installments"
import { validateReduction } from "../utils/finance-reductions"
import type { OfferingKind } from "../types/common"

/**
 * Authoritative form validation.
 *
 * Every monetary rule here delegates to the same pure policy the service enforces,
 * so a form can never accept a value the service would refuse — and the previewed
 * number can never differ from the saved one.
 */

const DECIMAL = /^\d+(\.\d+)?$/

/**
 * `superRefine` still runs when an inner field check has already failed, so every
 * monetary refinement must confirm the string is well-formed before doing money
 * math — otherwise a user typing letters gets a thrown parse error instead of a
 * validation message.
 */
const isDecimal = (value: unknown): value is string =>
  typeof value === "string" && DECIMAL.test(value.trim())

const decimalString = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => DECIMAL.test(value), "قيمة رقمية غير صحيحة")

export function createDraftInvoiceSchema(currency: string, precision: number) {
  return z
    .object({
      totalAmount: decimalString("الإجمالي مطلوب"),
      dueDate: z.string().min(1, "تاريخ الاستحقاق مطلوب"),
      discount: z
        .object({
          kind: z.enum(["percentage", "amount"]),
          value: decimalString("قيمة الخصم مطلوبة"),
        })
        .optional(),
      scholarship: z
        .object({
          kind: z.enum(["percentage", "amount"]),
          value: decimalString("قيمة المنحة مطلوبة"),
        })
        .optional(),
    })
    .superRefine((value, context) => {
      if (!isDecimal(value.totalAmount)) return
      const total = makeMoney(value.totalAmount, currency, precision)
      if (compare(total, makeMoney("0", currency, precision)) <= 0)
        context.addIssue({
          code: "custom",
          path: ["totalAmount"],
          message: "يجب أن يكون الإجمالي أكبر من صفر",
        })
    })
}

export function createInstallmentPlanSchema(
  offeringKind: OfferingKind,
  policy: readonly InstallmentEligibility[],
  hasPaidInstallments: boolean
) {
  return z
    .object({
      count: z.number().int("عدد الأقساط يجب أن يكون رقمًا صحيحًا"),
      scheduleBasis: z.enum(["monthly", "custom"]),
      firstDueDate: z.string().min(1, "تاريخ استحقاق أول قسط مطلوب"),
    })
    .superRefine((value, context) => {
      const result = validatePlanRequest({
        offeringKind,
        count: value.count,
        policy,
        hasPaidInstallments,
      })
      if (result.ok) return
      context.addIssue({
        code: "custom",
        path: ["count"],
        message:
          result.code === "installments-not-permitted"
            ? "هذا النوع من المنتجات لا يسمح بخطط التقسيط"
            : result.code === "plan-has-payments"
              ? "لا يمكن إعادة إنشاء الخطة بعد تسجيل مدفوعات على أحد الأقساط"
              : `عدد الأقساط يجب أن يكون بين ١ و ${result.maxCount ?? 0}`,
      })
    })
}

export function createPaymentSchema(input: {
  currency: string
  precision: number
  /** Remaining on the invoice, re-checked again inside the service. */
  invoiceRemaining: Money
  /** Remaining on the targeted installment, when one is selected. */
  installmentRemaining?: Money
  methods: readonly PaymentMethod[]
  issueDate?: string
  today: string
}) {
  return z
    .object({
      methodId: z.string().min(1, "طريقة الدفع مطلوبة"),
      paymentDate: z.string().min(1, "تاريخ الدفع مطلوب"),
      amount: decimalString("المبلغ مطلوب"),
      installmentId: z.string().optional(),
      notes: z.string().trim().max(500, "الملاحظات تتجاوز الحد المسموح").optional(),
    })
    .superRefine((value, context) => {
      const zero = makeMoney("0", input.currency, input.precision)
      const amount = isDecimal(value.amount)
        ? makeMoney(value.amount, input.currency, input.precision)
        : undefined

      if (!amount) {
        // The field's own check already reported the malformed value.
      } else if (compare(amount, zero) <= 0)
        context.addIssue({
          code: "custom",
          path: ["amount"],
          message: "يجب أن يكون المبلغ أكبر من صفر",
        })
      else if (compare(amount, input.invoiceRemaining) > 0)
        context.addIssue({
          code: "custom",
          path: ["amount"],
          message: `المبلغ يتجاوز المتبقي على الفاتورة (${input.invoiceRemaining.amount})`,
        })
      else if (
        input.installmentRemaining &&
        compare(amount, input.installmentRemaining) > 0
      )
        context.addIssue({
          code: "custom",
          path: ["amount"],
          message: `المبلغ يتجاوز المتبقي على القسط (${input.installmentRemaining.amount})`,
        })

      const method = input.methods.find((item) => item.id === value.methodId)
      if (!method)
        context.addIssue({
          code: "custom",
          path: ["methodId"],
          message: "طريقة الدفع غير معروفة",
        })
      else if (!method.active)
        context.addIssue({
          code: "custom",
          path: ["methodId"],
          message: "طريقة الدفع غير مفعّلة",
        })

      const paidAt = new Date(value.paymentDate).getTime()
      if (Number.isNaN(paidAt))
        context.addIssue({
          code: "custom",
          path: ["paymentDate"],
          message: "تاريخ الدفع غير صحيح",
        })
      else {
        if (paidAt > new Date(input.today).getTime())
          context.addIssue({
            code: "custom",
            path: ["paymentDate"],
            message: "لا يمكن تسجيل دفعة بتاريخ مستقبلي",
          })
        if (input.issueDate && paidAt < new Date(input.issueDate).getTime())
          context.addIssue({
            code: "custom",
            path: ["paymentDate"],
            message: "لا يمكن أن يسبق تاريخ الدفع تاريخ إصدار الفاتورة",
          })
      }
    })
}

export function createReductionSchema(input: {
  base: Money
  currentFinal: Money
  collected: Money
  policy: { maxPercentage: string; maxAmount?: Money }
  requireName?: boolean
}) {
  return z
    .object({
      name: input.requireName
        ? z.string().trim().min(2, "اسم المنحة مطلوب")
        : z.string().trim().optional(),
      kind: z.enum(["percentage", "amount"]),
      value: decimalString("القيمة مطلوبة"),
      reason: z.string().trim().min(3, "السبب مطلوب"),
      coverage: z.enum(["full-tuition", "partial-tuition"]).optional(),
    })
    .superRefine((value, context) => {
      if (!isDecimal(value.value)) return
      const result = validateReduction({
        base: input.base,
        reduction: { kind: value.kind, value: value.value },
        policy: input.policy,
        collected: input.collected,
        currentFinal: input.currentFinal,
      })
      if (result.ok) return

      context.addIssue({
        code: "custom",
        path: ["value"],
        message:
          result.code === "reduction-exceeds-limit"
            ? `القيمة تتجاوز الحد المسموح به (${result.limit ?? ""})`
            : result.code === "reduction-below-collected"
              ? `لا يمكن تخفيض الرصيد إلى ما دون المبلغ المحصّل (${result.collected ?? ""})`
              : "قيمة غير صحيحة",
      })
    })
}

export function createRefundSchema(input: {
  currency: string
  precision: number
  /** Payment amount less refunds already recorded against it. */
  refundable: Money
  today: string
}) {
  return z
    .object({
      amount: decimalString("المبلغ مطلوب"),
      reason: z.string().trim().min(3, "سبب الاسترداد مطلوب"),
      refundDate: z.string().min(1, "تاريخ الاسترداد مطلوب"),
    })
    .superRefine((value, context) => {
      const zero = makeMoney("0", input.currency, input.precision)
      const amount = isDecimal(value.amount)
        ? makeMoney(value.amount, input.currency, input.precision)
        : undefined

      if (!amount) {
        // The field's own check already reported the malformed value.
      } else if (compare(amount, zero) <= 0)
        context.addIssue({
          code: "custom",
          path: ["amount"],
          message: "يجب أن يكون المبلغ أكبر من صفر",
        })
      else if (compare(amount, input.refundable) > 0)
        context.addIssue({
          code: "custom",
          path: ["amount"],
          message: `قيمة الاسترداد تتجاوز المتاح من الدفعة (${input.refundable.amount})`,
        })

      if (new Date(value.refundDate).getTime() > new Date(input.today).getTime())
        context.addIssue({
          code: "custom",
          path: ["refundDate"],
          message: "لا يمكن تسجيل استرداد بتاريخ مستقبلي",
        })
    })
}

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(3, "سبب الإلغاء مطلوب"),
})
