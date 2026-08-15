import { z } from "zod"

/**
 * Category and sub-category identity.
 *
 * Uniqueness is scoped differently for each: a category name is unique across the
 * organization, a sub-category name only within its parent — "المطبوعات" under
 * Marketing and under Office are different things, and forbidding that would push
 * users into inventing awkward names.
 */
export const categorySchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب"),
  description: z.string().trim().max(500, "الوصف طويل جدًا"),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

export const emptyCategoryValues: CategoryFormValues = {
  name: "",
  description: "",
}

export const subCategorySchema = categorySchema.extend({
  categoryId: z.string().min(1, "التصنيف الرئيسي مطلوب"),
})

export type SubCategoryFormValues = z.infer<typeof subCategorySchema>

export const emptySubCategoryValues: SubCategoryFormValues = {
  categoryId: "",
  name: "",
  description: "",
}

/** Case- and whitespace-insensitive, so "التسويق" and "التسويق " collide. */
export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}
