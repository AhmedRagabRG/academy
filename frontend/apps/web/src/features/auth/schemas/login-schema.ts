import { z } from "zod"

export const loginSchema = z.object({
  email: z.email("أدخل بريدًا إلكترونيًا صحيحًا"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
})

export type LoginValues = z.infer<typeof loginSchema>
