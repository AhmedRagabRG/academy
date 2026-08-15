import { z } from "zod"
import type { FinancialRevisionId } from "../types/common"
/**
 * A money amount is a decimal string, checked by shape rather than by parsing it
 * to a float. `precision` is required so consumers converting to minor units
 * never have to guess it.
 */
const DECIMAL = /^\d+(\.\d+)?$/

const money = z.object({
  amount: z
    .string()
    .trim()
    .refine((v) => DECIMAL.test(v), "أدخل مبلغًا صحيحًا"),
  currency: z.string().min(3),
  precision: z.number().int().min(0),
})
export const installmentSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "العنوان مطلوب"),
  value: z.string().refine((v) => Number(v) > 0, "القيمة يجب أن تكون موجبة"),
  milestoneId: z.string().min(1),
  position: z.number().int().nonnegative(),
})
export const installmentPlanSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  basis: z.enum(["amount", "percentage"]),
  coveredCharge: z.enum(["program-price", "registration-fee", "combined"]),
  status: z.enum(["active", "inactive"]),
  installments: z.array(installmentSchema).min(1),
})
export const offerSchema = z
  .object({
    id: z.string(),
    kind: z.enum(["discount", "scholarship"]),
    name: z.string().min(1),
    valueType: z.enum(["amount", "percentage"]),
    value: z.string().refine((v) => Number(v) > 0),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((v, ctx) => {
    if (v.valueType === "percentage" && Number(v.value) > 100)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "النسبة لا تتجاوز 100%",
      })
    if (v.validFrom && v.validTo && v.validFrom > v.validTo)
      ctx.addIssue({
        code: "custom",
        path: ["validTo"],
        message: "تاريخ النهاية يسبق البداية",
      })
  })
export const financialProfileSchema = z.object({
  programPrice: money,
  registrationFee: money,
  installmentsEnabled: z.boolean(),
  installmentPlans: z.array(installmentPlanSchema),
  offers: z.array(offerSchema),
  currentRevisionId: z.custom<FinancialRevisionId>(
    (value) => typeof value === "string"
  ),
})
