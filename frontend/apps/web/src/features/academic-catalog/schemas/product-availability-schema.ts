import { z } from "zod"
export const productAvailabilitySchema = z
  .array(
    z.object({
      branchId: z.string().min(1),
      role: z.enum(["registration", "study", "general"]),
    })
  )
  .superRefine((items, context) => {
    const keys = new Set<string>()
    for (const [index, item] of items.entries()) {
      const key = `${item.branchId}:${item.role}`
      if (keys.has(key))
        context.addIssue({
          code: "custom",
          message: "لا يمكن تكرار دور الفرع",
          path: [index],
        })
      keys.add(key)
    }
  })
