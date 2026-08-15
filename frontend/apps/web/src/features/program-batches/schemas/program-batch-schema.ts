import { z } from "zod"
import { financialProfileSchema } from "./batch-financial-schema"
const optionalDate = z.union([z.literal(""), z.iso.date()]).optional()
export const programBatchSchema = z.object({
  name: z.object({
    ar: z.string().min(2, "اسم الدفعة مطلوب"),
    en: z.string().optional(),
  }),
  code: z
    .string()
    .trim()
    .min(2, "رمز الدفعة مطلوب")
    .regex(/^[A-Za-z0-9_-]+$/, "استخدم أحرفًا وأرقامًا فقط"),
  academicYearId: z.string().min(1, "العام الأكاديمي مطلوب"),
  intakeId: z.string().min(1, "فترة القبول مطلوبة"),
  description: z.string(),
  schedule: z
    .object({
      registrationStartDate: optionalDate,
      registrationEndDate: optionalDate,
      studyStartDate: optionalDate,
      studyEndDate: optionalDate,
      graduationDate: optionalDate,
    })
    .superRefine((v, ctx) => {
      const strictPairs: Array<[keyof typeof v, keyof typeof v, string]> = [
        [
          "registrationStartDate",
          "registrationEndDate",
          "نهاية التسجيل يجب أن تلي بدايته",
        ],
        ["studyStartDate", "studyEndDate", "نهاية الدراسة يجب أن تلي بدايتها"],
      ]
      for (const [a, b, message] of strictPairs)
        if (v[a] && v[b] && v[a]! >= v[b]!)
          ctx.addIssue({ code: "custom", path: [b], message })
      if (
        v.registrationEndDate &&
        v.studyStartDate &&
        v.registrationEndDate > v.studyStartDate
      )
        ctx.addIssue({
          code: "custom",
          path: ["studyStartDate"],
          message: "الدراسة لا تبدأ قبل نهاية التسجيل",
        })
      if (
        v.studyEndDate &&
        v.graduationDate &&
        v.studyEndDate > v.graduationDate
      )
        ctx.addIssue({
          code: "custom",
          path: ["graduationDate"],
          message: "التخرج لا يسبق نهاية الدراسة",
        })
    }),
  maximumStudents: z.number().int().positive("السعة يجب أن تكون موجبة"),
  financialProfile: financialProfileSchema,
  branchAssignments: z.array(
    z.object({
      branchId: z.string(),
      role: z.enum(["registration", "study"]),
      status: z.enum(["active", "historical"]),
    })
  ),
})
export type ProgramBatchFormValues = z.infer<typeof programBatchSchema>
