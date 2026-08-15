import { z } from "zod"
import type { StudentDocumentType } from "../types/domain"

/** Mirrors the pure rules in `utils/student-documents.ts` for form-level feedback. */
export function createStudentDocumentSchema(type: StudentDocumentType) {
  return z.object({
    file: z
      .instanceof(File, { message: "يجب اختيار ملف" })
      .refine((file) => file.size > 0, "تعذر قراءة الملف. تأكد من سلامته.")
      .refine(
        (file) => type.allowedMimeTypes.includes(file.type),
        `نوع الملف غير مدعوم. الأنواع المسموح بها: ${type.allowedMimeTypes.join("، ")}`
      )
      .refine(
        (file) => file.size <= type.maxBytes,
        `حجم الملف يتجاوز ${Math.round(type.maxBytes / (1024 * 1024))} ميجابايت`
      ),
    uploadAttemptId: z.string().min(1),
  })
}

export const archiveDocumentSchema = z.object({
  reason: z.string().trim().max(250).optional(),
})

export type StudentDocumentFormValues = z.infer<
  ReturnType<typeof createStudentDocumentSchema>
>
