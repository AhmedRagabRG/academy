import { z } from "zod"
const range = z.object({ name: z.string().trim().min(2), startDate: z.iso.date("تاريخ البداية غير صالح"), endDate: z.iso.date("تاريخ النهاية غير صالح"), status: z.enum(["active", "inactive", "archived"]) }).refine((value) => value.startDate <= value.endDate, { path: ["endDate"], message: "تاريخ النهاية يجب أن يلي البداية" })
export const academicYearSchema = range.safeExtend({ code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()) })
export const academicTermSchema = range.safeExtend({ academicYearId: z.string().min(1, "اختر العام الأكاديمي"), academicYearName: z.string().min(1), order: z.coerce.number().int().min(1, "ترتيب الفصل يبدأ من 1") })
export type AcademicYearInput = z.infer<typeof academicYearSchema>
export type AcademicTermInput = z.infer<typeof academicTermSchema>
