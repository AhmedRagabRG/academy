import { z } from "zod"
export const orderedContentSchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().trim().min(1),
    description: z.string().optional(),
    position: z.number().int().min(0),
    required: z.boolean().optional(),
  })
)
export const catalogAssetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["primary", "gallery", "brochure", "video"]),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().min(0).max(10_000_000),
  url: z.string().min(1),
  label: z.string().trim().min(1),
  position: z.number().int().min(0),
})
