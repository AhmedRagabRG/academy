import { z } from "zod"
const positiveOptional = z.coerce
  .number()
  .positive("يجب أن تكون القيمة أكبر من صفر")
  .optional()
/**
 * A money amount is validated as a **decimal string**, never coerced to a number.
 *
 * `z.coerce.number()` would put a float on a price, which is the one thing
 * `shared/utils/money.ts` exists to prevent. The string is checked for shape here
 * and only ever converted to integer minor units by the money helpers.
 */
const DECIMAL = /^\d+(\.\d+)?$/

const moneyAmount = z
  .string()
  .trim()
  .min(1, "القيمة مطلوبة")
  .refine((value) => DECIMAL.test(value), "لا يمكن أن تكون القيمة سالبة")

const money = z.object({
  amount: moneyAmount,
  currency: z.string().min(1),
  precision: z.number().int().min(0),
})
export const productSchema = z.object({
  officialName: z.string().trim().min(2, "الاسم الرسمي مطلوب"),
  nameAr: z.string().trim().min(2, "الاسم العربي مطلوب"),
  nameEn: z.string().trim().min(2, "الاسم الإنجليزي مطلوب"),
  code: z
    .string()
    .trim()
    .min(2, "رمز المنتج مطلوب")
    .regex(/^[A-Za-z0-9-]+$/, "استخدم أحرفًا وأرقامًا وشرطة فقط"),
  productTypeId: z.string().min(1, "نوع المنتج مطلوب"),
  categoryId: z.string().min(1, "التصنيف مطلوب"),
  departmentId: z.string().optional(),
  description: z.string().trim().min(10, "أضف وصفًا أوضح"),
  academic: z.object({
    duration: positiveOptional,
    durationUnit: z.string().optional(),
    termCount: positiveOptional,
    sessionCount: positiveOptional,
    hourCount: positiveOptional,
    studyMode: z.string().optional(),
    trainingIncluded: z.boolean().optional(),
    internshipIncluded: z.boolean().optional(),
    certificateIncluded: z.boolean().optional(),
    finalProjectRequired: z.boolean().optional(),
  }),
  pricing: z.object({
    basePrice: money,
    registrationFees: money,
    certificateFees: money,
    trainingFees: money,
    cardFees: money,
    examFees: money,
    additionalFees: money,
    discount: money,
    scholarship: money,
    installmentAvailable: z.boolean(),
    installmentMinCount: z.coerce.number().int().min(1, "الحد الأدنى قسط واحد").max(60),
    installmentMaxCount: z.coerce.number().int().min(1, "الحد الأقصى قسط واحد").max(60),
    installmentFrequency: z.enum(["weekly", "monthly", "bimonthly"]),
  }).refine(
    (pricing) =>
      !pricing.installmentAvailable ||
      pricing.installmentMaxCount >= pricing.installmentMinCount,
    { path: ["installmentMaxCount"], message: "الحد الأقصى يجب ألا يقل عن الحد الأدنى" }
  ),
  branches: z.array(
    z.object({
      branchId: z.string(),
      role: z.enum(["registration", "study", "general"]),
    })
  ),
  content: z.object({
    salesScript: z.string(),
    faqs: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        position: z.number(),
        required: z.boolean().optional(),
      })
    ),
    admissionRequirements: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        position: z.number(),
        required: z.boolean().optional(),
      })
    ),
    requiredDocuments: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        position: z.number(),
        required: z.boolean().optional(),
      })
    ),
  }),
})
export type ProductFormValues = z.infer<typeof productSchema>
