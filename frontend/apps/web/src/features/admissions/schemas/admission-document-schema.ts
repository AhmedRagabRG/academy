import { z } from "zod"

export const documentFileSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  size: z.number().positive().max(5_000_000),
  previewUrl: z.string().optional(),
})

export const documentDecisionSchema = z
  .object({
    decision: z.enum(["verified", "rejected"]),
    reason: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === "rejected" && !value.reason?.trim())
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "سبب الرفض مطلوب",
      })
  })
