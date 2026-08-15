import { z } from "zod"
export const generalSettingsSchema = z.object({ defaultLanguage: z.string().min(2), timeZone: z.string().min(1), currency: z.string().length(3), dateFormat: z.string().min(1), numberFormat: z.string().min(1), workingDays: z.array(z.string()).min(1, "اختر يوم عمل واحدًا على الأقل"), defaultBranchId: z.string().min(1), defaultAcademicYearId: z.string().min(1) })
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>
