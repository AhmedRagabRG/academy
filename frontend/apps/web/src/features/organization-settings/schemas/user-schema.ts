import { z } from "zod"
/** The API requires an international phone with a leading `+` for employees. */
const phone = z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/, "أدخل رقمًا دوليًا يبدأ بعلامة +")

/**
 * The initial password, mirroring the server's policy.
 *
 * The API enforces length plus lowercase, uppercase, digit and symbol, and
 * answers a weak password with a single field error. Checking the same rule
 * here means the requirement is stated before the form is submitted rather
 * than discovered by having it rejected.
 *
 * `PASSWORD_MIN_LENGTH` is server configuration, so this length is a mirror of
 * it, not the source: raising it on the server without raising it here brings
 * the rejection back.
 */
const PASSWORD_MIN_LENGTH = 12
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `يجب أن تتكون كلمة المرور من ${PASSWORD_MIN_LENGTH} حرفًا على الأقل`)
  .regex(/[a-z]/, "يجب أن تحتوي كلمة المرور على حرف لاتيني صغير")
  .regex(/[A-Z]/, "يجب أن تحتوي كلمة المرور على حرف لاتيني كبير")
  .regex(/\d/, "يجب أن تحتوي كلمة المرور على رقم")
  .regex(/[^A-Za-z0-9]/, "يجب أن تحتوي كلمة المرور على رمز")

export const userSchema = z.object({ fullName: z.string().trim().min(3), email: z.email("البريد الإلكتروني غير صالح").transform((value) => value.toLowerCase()), phone, roleIds: z.array(z.string()).min(1, "اختر دورًا واحدًا على الأقل"), status: z.enum(["active", "inactive"]) })
/** Creating an employee also sets the initial password; editing never does. */
export const createUserSchema = userSchema.safeExtend({ password })
export type UserInput = z.infer<typeof userSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
