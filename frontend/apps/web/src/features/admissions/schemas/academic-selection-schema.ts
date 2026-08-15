import { z } from "zod"

export const academicSelectionSchema = z
  .object({
    offeringKind: z.enum([
      "professional-program",
      "professional-diploma",
      "training-course",
    ]),
    offeringId: z.string().min(1, "المنتج الأكاديمي مطلوب"),
    batchId: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.offeringKind === "professional-program" && !value.batchId)
      context.addIssue({
        code: "custom",
        path: ["batchId"],
        message: "الدفعة مطلوبة للبرنامج المهني",
      })
    if (value.offeringKind !== "professional-program" && value.batchId)
      context.addIssue({
        code: "custom",
        path: ["batchId"],
        message: "الدبلومات والدورات لا تستخدم دفعات",
      })
  })
