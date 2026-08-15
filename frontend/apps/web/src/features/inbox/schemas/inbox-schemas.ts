import { z } from "zod"

export const noteSchema = z.object({
  content: z.string().trim().min(1, "اكتب الملاحظة").max(4000),
})
export const replySchema = z
  .object({
    body: z.string().trim().max(4000),
    attachmentCount: z.number().int().min(0).max(5),
  })
  .refine((value) => value.body.length > 0 || value.attachmentCount > 0, {
    message: "اكتب رسالة أو أضف مرفقًا",
  })
export const filterSchema = z.object({
  search: z.string().max(120),
  unreadOnly: z.boolean(),
})
export const assignmentSchema = z.object({
  employeeId: z.string().nullable(),
  teamId: z.string().nullable(),
})
