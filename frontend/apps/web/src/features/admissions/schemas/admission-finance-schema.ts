import { z } from "zod"

export const financialInputSchema = z.object({
  discountMode: z.enum(["none", "percentage", "amount"]),
  discountValue: z.string().regex(/^\d+(\.\d{1,2})?$/, "أدخل قيمة مالية صحيحة"),
  reason: z.string().optional(),
})
