import { z } from "zod"
export const categorySchema = z.object({
  nameAr: z.string().trim().min(2, "الاسم العربي مطلوب"),
  nameEn: z.string().trim().min(2, "الاسم الإنجليزي مطلوب"),
  description: z.string().trim().min(3, "الوصف مطلوب"),
})
export const productTypeSchema = categorySchema.extend({
  fields: z
    .array(
      z.object({
        key: z.enum([
          "duration",
          "durationUnit",
          "termCount",
          "sessionCount",
          "hourCount",
          "studyMode",
          "trainingIncluded",
          "internshipIncluded",
          "certificateIncluded",
          "finalProjectRequired",
        ]),
        label: z.string(),
        kind: z.enum(["number", "option", "boolean"]),
        required: z.boolean(),
        position: z.number(),
      })
    )
    .min(1, "اختر حقلًا أكاديميًا واحدًا على الأقل"),
})
export type CategoryFormValues = z.infer<typeof categorySchema>
export type ProductTypeFormValues = z.infer<typeof productTypeSchema>
