import { z } from "zod"

/** Whitespace-only content is refused, not silently stored (spec US7-2). */
export const studentNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "لا يمكن حفظ ملاحظة فارغة")
    .max(2000, "الملاحظة تتجاوز الحد المسموح به"),
})

export type StudentNoteFormValues = z.infer<typeof studentNoteSchema>
