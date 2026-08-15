import { z } from "zod"
import type { StudentStatus } from "../types/common"
import { transitionRule } from "../utils/student-lifecycle"

const statusValues = [
  "active",
  "suspended",
  "graduated",
  "withdrawn",
  "archived",
] as const

/**
 * Reason requirements come from the same transition table the service enforces, so
 * the form can never accept a change the service would refuse (spec FR-029).
 */
export function createStudentStatusSchema(fromStatus: StudentStatus) {
  return z
    .object({
      toStatus: z.enum(statusValues),
      reason: z.string().trim().max(500).optional(),
    })
    .superRefine((value, context) => {
      const rule = transitionRule(fromStatus, value.toStatus)
      if (!rule) {
        context.addIssue({
          code: "custom",
          path: ["toStatus"],
          message: "هذا التغيير في الحالة غير مسموح به",
        })
        return
      }
      if (rule.reasonRequired && !value.reason?.trim()) {
        context.addIssue({
          code: "custom",
          path: ["reason"],
          message: "يجب إدخال سبب لتنفيذ هذا الإجراء",
        })
      }
    })
}

export type StudentStatusFormValues = z.infer<
  ReturnType<typeof createStudentStatusSchema>
>
