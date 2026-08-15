import { z } from "zod"
import type { StudentIdentityRules } from "../types/domain"
import {
  guardianPhoneRequired,
  identityEvidenceSatisfied,
  isPlausibleDateOfBirth,
  isPlausibleGraduationYear,
  isValidNationalId,
  isValidPhone,
} from "../utils/student-identity-rules"

/**
 * The single authoritative profile schema. Every rule in data-model.md lives here
 * and nowhere else, so no layer can validate differently.
 */
export function createStudentProfileSchema(
  rules: StudentIdentityRules,
  today = new Date().toISOString()
) {
  return z
    .object({
      identity: z.object({
        fullName: z
          .string()
          .trim()
          .min(3, "الاسم الكامل مطلوب ولا يقل عن ٣ أحرف")
          .max(120, "الاسم الكامل يتجاوز الحد المسموح"),
        primaryPhone: z
          .string()
          .trim()
          .min(1, "رقم الهاتف مطلوب")
          .refine((value) => isValidPhone(value, rules), "صيغة رقم الهاتف غير صحيحة"),
        // Carried through the form untouched so a save preserves it; the API
        // treats an absent guardian name as an instruction to clear it.
        guardianName: z.string().trim().max(120).optional(),
        guardianPhone: z
          .string()
          .trim()
          .optional()
          .refine(
            (value) => !value || isValidPhone(value, rules),
            "صيغة رقم هاتف ولي الأمر غير صحيحة"
          ),
        nationalId: z
          .string()
          .trim()
          .optional()
          .refine(
            (value) => !value || isValidNationalId(value, rules),
            "صيغة الرقم القومي غير صحيحة"
          ),
        alternativeIdentityReason: z.string().trim().max(250).optional(),
        address: z
          .string()
          .trim()
          .min(3, "العنوان مطلوب")
          .max(250, "العنوان يتجاوز الحد المسموح"),
        dateOfBirth: z
          .string()
          .min(1, "تاريخ الميلاد مطلوب")
          .refine(
            (value) => isPlausibleDateOfBirth(value, today),
            "تاريخ الميلاد غير منطقي"
          ),
        qualificationId: z.string().min(1, "المؤهل مطلوب"),
        qualificationLabel: z.string().min(1),
        graduationYear: z
          .number({ message: "سنة التخرج مطلوبة" })
          .int("سنة التخرج يجب أن تكون رقمًا صحيحًا"),
        profileImageUrl: z.string().trim().optional(),
      }),
      assignment: z.object({
        registrationBranchId: z.string().min(1, "فرع التسجيل مطلوب"),
        registrationBranchLabel: z.string().min(1),
        studyBranchId: z.string().min(1, "فرع الدراسة مطلوب"),
        studyBranchLabel: z.string().min(1),
        departmentId: z.string().min(1, "القسم مطلوب"),
        departmentLabel: z.string().min(1),
        academicGradeId: z.string().optional(),
        academicGradeLabel: z.string().optional(),
        customerServiceEmployeeId: z
          .string()
          .min(1, "موظف خدمة العملاء مطلوب"),
        customerServiceEmployeeName: z.string().min(1),
      }),
    })
    .superRefine((value, context) => {
      if (!identityEvidenceSatisfied(value.identity)) {
        context.addIssue({
          code: "custom",
          path: ["identity", "alternativeIdentityReason"],
          message:
            "يجب إدخال الرقم القومي أو تحديد سبب الاعتماد على مستند هوية بديل",
        })
      }
      if (
        guardianPhoneRequired(value.identity.dateOfBirth, rules, today) &&
        !value.identity.guardianPhone?.trim()
      ) {
        context.addIssue({
          code: "custom",
          path: ["identity", "guardianPhone"],
          message: "رقم هاتف ولي الأمر مطلوب للطالب القاصر",
        })
      }
      if (
        !isPlausibleGraduationYear(
          value.identity.graduationYear,
          value.identity.dateOfBirth,
          rules,
          today
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["identity", "graduationYear"],
          message: "سنة التخرج غير متوافقة مع تاريخ الميلاد أو تقع في المستقبل",
        })
      }
    })
}

export type StudentProfileFormValues = z.infer<
  ReturnType<typeof createStudentProfileSchema>
>
