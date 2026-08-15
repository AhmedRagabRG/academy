import { z } from "zod"
export const roleSchema = z.object({ name: z.string().trim().min(2), code: z.string().trim().regex(/^[a-z][a-z0-9.-]*$/, "الرمز يبدأ بحرف صغير ويحوي حروفًا صغيرة وأرقامًا و(.-) فقط").max(80), description: z.string().trim().min(3), permissionIds: z.array(z.string()), status: z.enum(["active", "inactive", "archived"]) })
export const rolePermissionsSchema = z.object({ roleId: z.string().min(1, "اختر الدور"), permissionIds: z.array(z.string()) })
export type RoleInput = z.infer<typeof roleSchema>
