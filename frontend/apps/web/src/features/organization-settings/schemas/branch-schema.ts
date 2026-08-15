import { z } from "zod"
export const branchSchema = z.object({ name: z.string().trim().min(2, "اسم الفرع مطلوب"), code: z.string().trim().min(2).max(12).transform((value) => value.toUpperCase()), email: z.email("البريد الإلكتروني غير صالح").transform((value) => value.toLowerCase()), address: z.string().trim().min(3), phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/, "رقم الهاتف غير صالح"), workingHours: z.string().trim().min(3), status: z.enum(["active", "archived"]) })
export type BranchInput = z.infer<typeof branchSchema>
