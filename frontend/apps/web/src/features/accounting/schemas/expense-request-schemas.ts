import { z } from "zod"
import type { ExpenseCategoryId, ExpenseSubCategoryId } from "../types/common"

/**
 * The single authoritative schema for an expense request.
 *
 * Used by both the form and the service, so a rule can never be enforced in one
 * place and forgotten in the other (constitution: forms and validation).
 */
const DECIMAL = /^\d+(\.\d+)?$/

const isDecimal = (value: unknown): value is string =>
  typeof value === "string" && DECIMAL.test(value.trim())

export interface CategoryShape {
  id: string
  status: "active" | "archived"
}

export interface SubCategoryShape {
  id: string
  categoryId: string
  status: "active" | "archived"
}

export function createExpenseRequestSchema(input: {
  precision: number
  /** Active and archived alike — an archived one must be *named* as archived. */
  categories: readonly CategoryShape[]
  subCategories: readonly SubCategoryShape[]
}) {
  const categoryById = new Map(input.categories.map((row) => [row.id, row]))
  const subCategoryById = new Map(input.subCategories.map((row) => [row.id, row]))

  return z
    .object({
      requestDate: z.string().min(1, "تاريخ الطلب مطلوب"),
      branchId: z.string().min(1, "الفرع مطلوب"),
      categoryId: z.string().min(1, "التصنيف الرئيسي مطلوب"),
      subCategoryId: z.string().optional(),
      description: z.string().trim().min(3, "الوصف مطلوب"),
      amount: z
        .string()
        .trim()
        .min(1, "المبلغ المطلوب مطلوب")
        .refine((value) => DECIMAL.test(value), "صيغة المبلغ غير صحيحة"),
    })
    .superRefine((value, context) => {
      // Guarded, because a `superRefine` still runs after a field check failed —
      // parsing a malformed amount here would throw instead of reporting.
      if (isDecimal(value.amount)) {
        // A string test rather than `Number(...) <= 0`: no float ever touches a
        // money value, not even to compare it.
        if (/^0+(\.0+)?$/.test(value.amount.trim()))
          context.addIssue({
            code: "custom",
            path: ["amount"],
            message: "يجب أن يكون المبلغ أكبر من صفر",
          })
        const decimals = value.amount.split(".")[1]?.length ?? 0
        if (decimals > input.precision)
          context.addIssue({
            code: "custom",
            path: ["amount"],
            message: `عدد الخانات العشرية يتجاوز ${input.precision}`,
          })
      }

      const category = categoryById.get(value.categoryId)
      if (value.categoryId && !category)
        context.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "التصنيف المختار غير موجود",
        })
      else if (category?.status === "archived")
        context.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "هذا التصنيف مؤرشف ولا يمكن اختياره في طلب جديد",
        })

      if (!value.subCategoryId) return
      const subCategory = subCategoryById.get(value.subCategoryId)
      if (!subCategory) {
        context.addIssue({
          code: "custom",
          path: ["subCategoryId"],
          message: "التصنيف الفرعي المختار غير موجود",
        })
        return
      }
      // The edge case the spec names: a sub-category chosen, then the parent changed.
      if (subCategory.categoryId !== value.categoryId)
        context.addIssue({
          code: "custom",
          path: ["subCategoryId"],
          message: "التصنيف الفرعي لا يتبع التصنيف الرئيسي المختار",
        })
      else if (subCategory.status === "archived")
        context.addIssue({
          code: "custom",
          path: ["subCategoryId"],
          message: "هذا التصنيف الفرعي مؤرشف ولا يمكن اختياره",
        })
    })
}

export type ExpenseRequestFormValues = {
  requestDate: string
  branchId: string
  categoryId: string
  subCategoryId: string
  description: string
  amount: string
}

export const emptyExpenseRequestValues: ExpenseRequestFormValues = {
  requestDate: "",
  branchId: "",
  categoryId: "",
  subCategoryId: "",
  description: "",
  amount: "",
}

export const cancelRequestSchema = z.object({
  reason: z.string().trim().min(3, "سبب الإلغاء مطلوب"),
})

export function toCommandInput(values: ExpenseRequestFormValues) {
  return {
    requestDate: values.requestDate,
    branchId: values.branchId,
    categoryId: values.categoryId as ExpenseCategoryId,
    subCategoryId: values.subCategoryId
      ? (values.subCategoryId as ExpenseSubCategoryId)
      : undefined,
    description: values.description.trim(),
    amount: values.amount.trim(),
  }
}
