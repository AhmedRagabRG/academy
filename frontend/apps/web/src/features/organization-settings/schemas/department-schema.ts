import { z } from "zod"
export const departmentSchema = z.object({ name: z.string().trim().min(2, "اسم القسم مطلوب"), code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()), description: z.string().trim().min(3), status: z.enum(["active", "inactive", "archived"]) })
export type DepartmentInput = z.infer<typeof departmentSchema>
